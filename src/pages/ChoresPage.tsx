import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  ClipboardList,
  Trash2,
  Calendar,
  User,
} from 'lucide-react';
import { useChoreStore, type Chore, type ChoreStatus } from '../store/choreStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

const statusLabel: Record<ChoreStatus, string> = {
  todo: 'Do zrobienia',
  in_progress: 'W trakcie',
  done: 'Zrobione',
};

const nextStatus = (s: ChoreStatus): ChoreStatus => {
  if (s === 'todo') return 'in_progress';
  if (s === 'in_progress') return 'done';
  return 'todo';
};

export const ChoresPage: React.FC = () => {
  const { chores, isLoading, fetchChores, addChore, updateStatus, updateAssignee, updateDueDate, deleteChore } =
    useChoreStore();
  const { members } = useFlatStore();
  const { user } = useAuthStore();
  const { markAsSeen } = useNotificationStore();

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchChores();
    markAsSeen('chores');
  }, [fetchChores, markAsSeen]);

  const getMemberName = (userId: string | null | undefined) => {
    if (!userId) return 'Nie przypisano';
    if (userId === user?.id) return 'Ty';
    const m = members.find((x) => x.user_id === userId);
    return m?.display_name || m?.email || `Konto ${userId.substring(0, 4)}`;
  };

  const activeChores = useMemo(() => {
    const list = chores.filter((c) => c.status !== 'done');
    return list.sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [chores]);

  const doneChores = useMemo(
    () => chores.filter((c) => c.status === 'done').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [chores]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!title.trim()) {
      setValidationError('Opis obowiązku nie może być pusty.');
      return;
    }
    const ok = await addChore(title.trim(), assigneeId || null, dueDate ? new Date(dueDate).toISOString() : null);
    if (ok) {
      setTitle('');
      setAssigneeId('');
      setDueDate('');
    } else {
      setValidationError('Nie udało się dodać zadania.');
    }
  };

  const renderRow = (chore: Chore) => (
    <li
      key={chore.id}
      className="animate-fade-in hover-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        marginBottom: '0.75rem',
        border: '1px solid var(--surface-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <strong style={{ fontSize: '1.05rem' }}>{chore.title}</strong>
          <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} /> {getMemberName(chore.assigned_to)}
            </span>
            {chore.due_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={14} />
                {new Date(chore.due_date).toLocaleString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '0.4rem 0.6rem' }}
          onClick={() => deleteChore(chore.id)}
          title="Usuń"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span
          className={`expenses-history-status-pill ${chore.status === 'todo' ? 'is-open' : chore.status === 'in_progress' ? '' : 'is-closed'}`}
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background:
              chore.status === 'todo'
                ? 'rgba(245, 158, 11, 0.15)'
                : chore.status === 'in_progress'
                  ? 'rgba(99, 102, 241, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
          }}
        >
          {statusLabel[chore.status]}
        </span>
        <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => updateStatus(chore.id, nextStatus(chore.status))}>
          → {statusLabel[nextStatus(chore.status)]}
        </button>
      </div>

      <div className="chore-row-fields">
        <label>
          <span>Przypisz</span>
          <div className="chores-field-with-icon">
            <User size={16} strokeWidth={2} aria-hidden />
            <select
              className="input-field chores-field-compact"
              value={chore.assigned_to || ''}
              onChange={(e) => updateAssignee(chore.id, e.target.value || null)}
              disabled={isLoading}
              aria-label="Przypisz lokatora"
            >
              <option value="">— dowolny —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || m.email || m.user_id.substring(0, 4)}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label>
          <span>Termin</span>
          <div className="chores-field-with-icon">
            <Calendar size={16} strokeWidth={2} aria-hidden />
            <input
              type="datetime-local"
              className="input-field chores-field-compact"
              value={
                chore.due_date
                  ? new Date(chore.due_date).toISOString().slice(0, 16)
                  : ''
              }
              onChange={(e) => {
                const v = e.target.value;
                updateDueDate(chore.id, v ? new Date(v).toISOString() : null);
              }}
              disabled={isLoading}
              aria-label="Termin zadania"
            />
          </div>
        </label>
      </div>
    </li>
  );

  return (
    <div className="main-content animate-fade-in page-shell chores-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/">
          <button className="btn-secondary" style={{ padding: '0.6rem' }} type="button">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h2>Harmonogram obowiązków</h2>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} color="var(--primary-color)" /> Dodaj zadanie
        </h3>
        {validationError && (
          <div className="error-message" style={{ marginBottom: '1rem', marginTop: 0 }}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>Co do zrobienia?</label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Sprzątanie kuchni, Wyniesienie śmieci..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="chores-add-form-meta">
            <div className="form-group">
              <label htmlFor="chores-assignee">Kto odpowiada (opcjonalnie)</label>
              <div className="chores-field-with-icon">
                <User size={18} strokeWidth={2} aria-hidden />
                <select
                  id="chores-assignee"
                  className="input-field"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  aria-label="Wybierz lokatora odpowiedzialnego za zadanie"
                >
                  <option value="">— wybierz lokatora —</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email || m.user_id.substring(0, 4)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="chores-due">Termin (opcjonalnie)</label>
              <div className="chores-field-with-icon">
                <Calendar size={18} strokeWidth={2} aria-hidden />
                <input
                  id="chores-due"
                  type="datetime-local"
                  className="input-field"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  aria-label="Termin wykonania zadania"
                />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Zapisywanie...' : 'Dodaj do harmonogramu'}
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={20} color="var(--primary-color)" /> Aktywne ({activeChores.length})
        </h3>
        {activeChores.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
            Brak aktywnych zadań. Dodaj pierwszy obowiązek powyżej.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>{activeChores.map(renderRow)}</ul>
        )}
      </div>

      {doneChores.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Zrobione ({doneChores.length})</h4>
          <ul style={{ listStyle: 'none', padding: 0, opacity: 0.85 }}>{doneChores.map(renderRow)}</ul>
        </div>
      )}
    </div>
  );
};
