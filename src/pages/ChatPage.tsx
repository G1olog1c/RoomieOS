import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayDividerLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = (startOfDay(now) - startOfDay(d)) / 86400000;
  if (diffDays === 0) return 'Dzisiaj';
  if (diffDays === 1) return 'Wczoraj';
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentFlat, members } = useFlatStore();
  const { markAsSeen } = useNotificationStore();
  const { messages, hasMore, isLoading, isSending, error, fetchMessages, sendMessage, subscribeToRoom, clearMessages } =
    useChatStore();

  const [draft, setDraft] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const senderLabel = useCallback(
    (id: string) => {
      if (id === user?.id) return 'Ty';
      const m = members.find((x) => x.user_id === id);
      return m?.display_name || m?.email || `Konto ${id.substring(0, 4)}`;
    },
    [members, user?.id]
  );

  const initials = useCallback(
    (id: string) => {
      const name = senderLabel(id);
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    },
    [senderLabel]
  );

  useEffect(() => {
    if (!currentFlat) return;

    fetchMessages();
    markAsSeen('chat');
    const unsub = subscribeToRoom(currentFlat.id);

    return () => {
      unsub();
      clearMessages();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flat id zmienia pokój; akcje ze store są stabilne
  }, [currentFlat?.id]);

  useEffect(() => {
    if (stickBottomRef.current) {
      scrollToBottom(messages.length < 15 ? 'auto' : 'smooth');
    }
  }, [messages, scrollToBottom]);

  const onThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    stickBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  const submitMessage = async () => {
    const t = draft.trim();
    if (!t || isSending) return;
    const ok = await sendMessage(t);
    if (ok) {
      setDraft('');
      stickBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    const el = threadRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    await fetchMessages({ before: messages[0].created_at });
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevHeight;
      }
    });
  };

  const rows: React.ReactNode[] = [];
  let prevDay = '';
  messages.forEach((msg, i) => {
    const day = dayDividerLabel(msg.created_at);
    if (day !== prevDay) {
      prevDay = day;
      rows.push(
        <li key={`d-${msg.id}-${day}`} className="chat-day-divider" aria-hidden>
          <span>{day}</span>
        </li>
      );
    }
    const prev = messages[i - 1];
    const clusterStart = !prev || prev.sender_id !== msg.sender_id;
    const mine = msg.sender_id === user?.id;
    rows.push(
      <li key={msg.id} className={`chat-row ${mine ? 'chat-row--mine' : 'chat-row--theirs'} ${clusterStart ? 'chat-row--cluster-start' : ''}`}>
        {!mine && clusterStart && (
          <div className="chat-avatar" aria-hidden>
            {initials(msg.sender_id)}
          </div>
        )}
        {!mine && !clusterStart && <div className="chat-avatar-spacer" aria-hidden />}
        <div className={`chat-bubble-wrap ${mine ? 'chat-bubble-wrap--mine' : ''}`}>
          {clusterStart && !mine && <div className="chat-sender-name">{senderLabel(msg.sender_id)}</div>}
          <div className="chat-bubble">
            <p className="chat-bubble-text">{msg.content}</p>
            <time className="chat-bubble-time" dateTime={msg.created_at}>
              {timeShort(msg.created_at)}
            </time>
          </div>
        </div>
      </li>
    );
  });

  return (
    <div className="main-content chat-page animate-fade-in">
      <header className="chat-header glass-panel">
        <Link to="/">
          <button type="button" className="btn-secondary chat-back-btn" aria-label="Wróć do pulpitu">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="chat-header-text">
          <h2 className="chat-header-title">
            <MessageCircle size={22} color="var(--primary-color)" className="chat-header-icon" />
            Czat mieszkania
          </h2>
          <p className="chat-header-sub">{currentFlat?.name}</p>
        </div>
      </header>

      <div className="chat-body">
        <div className="chat-thread-wrap glass-panel">
          {error && (
            <div className="error-message chat-thread-error" style={{ margin: '0.75rem 1rem' }}>
              <span>{error}</span>
            </div>
          )}
          <div className="chat-thread" ref={threadRef} onScroll={onThreadScroll} role="log" aria-live="polite">
            {hasMore && messages.length > 0 && (
              <div className="chat-load-older">
                <button type="button" className="btn-secondary chat-load-older-btn" onClick={() => void loadOlder()} disabled={loadingOlder || isLoading}>
                  {loadingOlder ? <Loader2 className="chat-spin" size={16} /> : null}
                  Starsze wiadomości
                </button>
              </div>
            )}
            {isLoading && messages.length === 0 ? (
              <div className="chat-thread-empty">
                <Loader2 className="chat-spin" size={28} />
                <span>Ładowanie rozmowy…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-thread-empty">
                <MessageCircle size={40} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
                <p>Brak wiadomości. Napisz coś pierwszy — reszta lokatorów zobaczy to na żywo.</p>
              </div>
            ) : (
              <ul className="chat-message-list">{rows}</ul>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
            <textarea
              className="input-field chat-composer-input"
              placeholder="Napisz wiadomość…"
              rows={1}
              maxLength={4000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Treść wiadomości"
            />
            <button type="submit" className="btn-primary chat-send-btn" disabled={isSending || !draft.trim()} aria-label="Wyślij">
              {isSending ? <Loader2 className="chat-spin" size={20} /> : <Send size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
