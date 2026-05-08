import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotificationEvent =
  | { id: string; kind: 'expenses'; created_at: string; message: string; expenseType: 'Zakupy' | 'Rachunki' | 'Inne' }
  | { id: string; kind: 'shopping'; created_at: string; message: string }
  | { id: string; kind: 'chores'; created_at: string; message: string };

type ExpenseRow = {
  id: string;
  payer_id: string;
  expense_type?: string | null;
  created_at: string;
};

type ShoppingItemRow = {
  id: string;
  added_by: string;
  title: string;
  created_at: string;
};

type ChoreNotifRow = {
  id: string;
  created_by: string | null;
  title: string;
  created_at: string;
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentFlat, members } = useFlatStore();
  const { markAllModulesSeen } = useNotificationStore();

  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.user_id, m.display_name || m.email || `Konto ${m.user_id.substring(0, 4)}`);
    }
    return map;
  }, [members]);

  useEffect(() => {
    if (!isOpen || !user || !currentFlat) return;

    setLoading(true);
    const run = async () => {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from('flat_members')
          .select('last_seen_expenses, last_seen_shopping, last_seen_chores')
          .eq('flat_id', currentFlat.id)
          .eq('user_id', user.id)
          .single();

        if (memberError) throw memberError;

        const lastSeenExpenses = memberData?.last_seen_expenses || new Date(0).toISOString();
        const lastSeenShopping = memberData?.last_seen_shopping || new Date(0).toISOString();
        const lastSeenChores = memberData?.last_seen_chores || new Date(0).toISOString();

        const [expRes, shopRes, choreRes] = await Promise.all([
          supabase
            .from('expenses')
            .select('*')
            .eq('flat_id', currentFlat.id)
            .gt('created_at', lastSeenExpenses)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('shopping_items')
            .select('*')
            .eq('flat_id', currentFlat.id)
            .eq('is_completed', false)
            .neq('added_by', user.id)
            .gt('created_at', lastSeenShopping)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('chores')
            .select('*')
            .eq('flat_id', currentFlat.id)
            .in('status', ['todo', 'in_progress'])
            .gt('created_at', lastSeenChores)
            .or(`created_by.is.null,created_by.neq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (expRes.error) throw expRes.error;
        if (shopRes.error) throw shopRes.error;
        if (choreRes.error) throw choreRes.error;

        const expenseEvents: NotificationEvent[] = ((expRes.data || []) as ExpenseRow[]).map((e) => {
          const payerName = memberNameById.get(e.payer_id) || `Konto ${String(e.payer_id).substring(0, 4)}`;
          const expenseType = (e.expense_type || 'Zakupy') as 'Zakupy' | 'Rachunki' | 'Inne';
          const expenseTypeLower = expenseType === 'Zakupy' ? 'zakupy' : expenseType === 'Rachunki' ? 'rachunki' : 'wydatki';
          return {
            id: `exp-${e.id}`,
            kind: 'expenses',
            created_at: e.created_at,
            expenseType,
            message: `${payerName} dodał rozliczenie za ${expenseTypeLower}`,
          };
        });

        const shoppingEvents: NotificationEvent[] = ((shopRes.data || []) as ShoppingItemRow[]).map((i) => {
          const adderName = memberNameById.get(i.added_by) || `Konto ${String(i.added_by).substring(0, 4)}`;
          return {
            id: `shop-${i.id}`,
            kind: 'shopping',
            created_at: i.created_at,
            message: `${adderName} dodał „${i.title}” na listę`,
          };
        });

        const choreEvents: NotificationEvent[] = ((choreRes.data || []) as ChoreNotifRow[]).map((c) => {
          if (c.created_by) {
            const name = memberNameById.get(c.created_by) || `Konto ${String(c.created_by).substring(0, 4)}`;
            return {
              id: `chore-${c.id}`,
              kind: 'chores',
              created_at: c.created_at,
              message: `${name} dodał zadanie „${c.title}”`,
            };
          }
          return {
            id: `chore-${c.id}`,
            kind: 'chores',
            created_at: c.created_at,
            message: `Nowe zadanie w harmonogramie: „${c.title}”`,
          };
        });

        const merged = [...expenseEvents, ...shoppingEvents, ...choreEvents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setEvents(merged);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isOpen, user, currentFlat, memberNameById]);

  const handleMarkAll = async () => {
    await markAllModulesSeen();
    onClose();
  };

  if (!isOpen) return null;

  const summary = {
    newExpenses: events.filter((e) => e.kind === 'expenses').length,
    newZakupy: events.filter((e) => e.kind === 'expenses' && e.expenseType === 'Zakupy').length,
    newRachunki: events.filter((e) => e.kind === 'expenses' && e.expenseType === 'Rachunki').length,
    newShopping: events.filter((e) => e.kind === 'shopping').length,
    newChores: events.filter((e) => e.kind === 'chores').length,
  };

  const hasAnySummary =
    summary.newExpenses > 0 || summary.newShopping > 0 || summary.newChores > 0;

  const kindLabel = (k: NotificationEvent['kind']) => {
    if (k === 'expenses') return 'Finanse';
    if (k === 'shopping') return 'Zakupy';
    return 'Harmonogram';
  };

  return (
    <div className="settings-backdrop animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal scale-in" style={{ maxWidth: '560px' }}>
        <div className="settings-header">
          <h2>Powiadomienia</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Zmiany od Twojej ostatniej wizyty w modułach
              </p>
              {hasAnySummary ? (
                <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Finanse: {summary.newExpenses} nowych rozliczeń (zakupy: {summary.newZakupy}, rachunki: {summary.newRachunki}) •
                  Zakupy: {summary.newShopping} nowych pozycji • Harmonogram: {summary.newChores} nowych zadań
                </p>
              ) : null}
            </div>
            <button className="btn-secondary" style={{ padding: '0.5rem 0.9rem' }} onClick={handleMarkAll} disabled={loading}>
              Oznacz jako przeczytane
            </button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Ładowanie...</p>
          ) : events.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Brak nowych powiadomień.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {events.map((e) => (
                <li
                  key={e.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 10,
                    border: '1px solid var(--surface-border)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{kindLabel(e.kind)}</div>
                  <div style={{ marginTop: '0.35rem' }}>{e.message}</div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(e.created_at).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
