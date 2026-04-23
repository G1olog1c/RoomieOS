import React, { useState } from 'react';
import { Calendar, User, AlignLeft, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useExpenseStore } from '../store/expenseStore';
import type { Expense } from '../store/expenseStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';

interface ExpenseDetailsContentProps {
  expense: Expense | null;
  onDelete?: () => void;
}

export const ExpenseDetailsContent: React.FC<ExpenseDetailsContentProps> = ({ expense, onDelete }) => {
  const { splits, settleDebt, expenses, deleteExpense, isLoading } = useExpenseStore();
  const { members } = useFlatStore();
  const { user } = useAuthStore();
  const [note, setNote] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!expense) return null;

  const isOwner = expense.payer_id === user?.id;

  const handleDelete = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten wydatek? Tej akcji nie można cofnąć.')) {
      return;
    }
    setIsDeleting(true);
    const success = await deleteExpense(expense.id);
    setIsDeleting(false);
    if (success && onDelete) {
      onDelete();
    }
  };

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return 'Ty';
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || member?.email || `Konto ${userId.substring(0, 4)}`;
  };

  const expenseSplits = splits.filter(s => s.expense_id === expense.id);
  const formattedDate = new Date(expense.created_at).toLocaleString('pl-PL');
  const expenseType = expense.expense_type || 'Zakupy';

  const sourceExpenseIds = expense.source_expense_ids || [];
  const sourceExpenses = sourceExpenseIds
    .map(id => expenses.find(e => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e);

  const handleSettle = async (splitId: string) => {
    await settleDebt(splitId, note ? note.trim() : undefined);
    setNote('');
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      {isOwner && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.2)',
              color: 'var(--error-color)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              opacity: isDeleting ? 0.6 : 1
            }}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Usuwanie...' : 'Usuń ten wydatek'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{expense.title}</h3>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Typ: <strong style={{ color: 'var(--text-primary)' }}>{expenseType}</strong>
        </div>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {expense.amount.toFixed(2)} zł
        </span>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
          <Calendar size={18} /> <span style={{ fontWeight: 500 }}>Dodano:</span> {formattedDate}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
          <User size={18} /> <span style={{ fontWeight: 500 }}>Zapłacił(a):</span> 
          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
            {getMemberName(expense.payer_id)}
          </span>
        </div>
      </div>

      <h4 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
        Rozliczenia z tego wydatku:
      </h4>

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {expenseSplits.map(split => {
          const isCreditor = expense.payer_id === user?.id;
          const isDebtor = split.user_id === user?.id;

          return (
            <li 
              key={split.id} 
              style={{ 
                padding: '1rem', 
                background: split.is_paid ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-color)', 
                borderRadius: '8px', 
                border: `1px solid ${split.is_paid ? 'rgba(16, 185, 129, 0.2)' : 'var(--surface-border)'}` 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {split.is_paid ? (
                    <CheckCircle size={16} color="var(--success-color)" />
                  ) : (
                    <Circle size={16} color="var(--text-secondary)" />
                  )}
                  <span style={{ fontWeight: 500 }}>{getMemberName(split.user_id)}</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {split.amount.toFixed(2)} zł
                </span>
              </div>

              {split.note && (
                <div 
                  style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)', 
                    display: 'flex', 
                    alignItems: 'start', 
                    gap: '0.5rem', 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: 'rgba(0,0,0,0.1)', 
                    borderRadius: '4px' 
                  }}
                >
                  <AlignLeft size={14} style={{ marginTop: '0.1rem' }} /> {split.note}
                </div>
              )}

              {!split.is_paid && (isCreditor || isDebtor) && split.user_id !== expense.payer_id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Opcjonalna notatka (np. blikiem)" 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                  />
                  <button 
                    className={isDebtor ? 'btn-primary' : 'btn-secondary'} 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                    onClick={() => handleSettle(split.id)}
                  >
                    {isDebtor ? 'Zapłać ten dług' : 'Oznacz jako opłacone przez lokatora'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {sourceExpenses.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
            Historia powstania (Smart Settlement)
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sourceExpenses.map(src => {
              const srcAnyUnpaid = splits.some(s => s.expense_id === src.id && !s.is_paid);
              return (
                <li
                  key={src.id}
                  style={{ 
                    padding: '0.9rem', 
                    background: 'rgba(99,102,241,0.06)', 
                    borderRadius: 10, 
                    border: '1px solid rgba(99,102,241,0.14)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                    <strong>{src.title}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {srcAnyUnpaid ? 'Otwarte' : 'Zamknięte'}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(src.created_at).toLocaleDateString('pl-PL', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })} • Zapłacił(a): {getMemberName(src.payer_id)} • {src.amount.toFixed(2)} zł
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
