import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, CheckCircle, Info, Pencil, ChevronDown } from 'lucide-react';
import { useExpenseStore } from '../store/expenseStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';
import { ExpenseDetailsContent } from './ExpenseDetailsContent';

interface SmartSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSettlementModal: React.FC<SmartSettlementModalProps> = ({ isOpen, onClose }) => {
  const { calculateOptimalDebts, simplifyDebts, isLoading, expenses, splits } = useExpenseStore();
  const { members } = useFlatStore();
  const { user } = useAuthStore();
  const [optimalTransactions, setOptimalTransactions] = useState<{from: string, to: string, amount: number}[]>([]);
  const [success, setSuccess] = useState(false);
  const [insertedDebts, setInsertedDebts] = useState<{ expenseId: string; splitId: string; from: string; to: string; amount: number }[]>([]);
  const [settleNewDebts, setSettleNewDebts] = useState(false);
  const [settleNewNote, setSettleNewNote] = useState('');
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOptimalTransactions(calculateOptimalDebts());
      setSuccess(false);
      setInsertedDebts([]);
      setSettleNewDebts(false);
      setSettleNewNote('');
      setExpandedDetailsId(null);
    }
  }, [isOpen, calculateOptimalDebts]);

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return 'Ty';
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || member?.email || `Konto ${userId.substring(0,4)}`;
  };

  const sortedOptimalTransactions = useMemo(() => {
    return [...optimalTransactions].sort((a, b) => b.amount - a.amount);
  }, [optimalTransactions]);

  const sortedInsertedDebts = useMemo(() => {
    return [...insertedDebts].sort((a, b) => b.amount - a.amount);
  }, [insertedDebts]);

  if (!isOpen) return null;

  const handleSimplify = async () => {
    const result = await simplifyDebts({
      settleNewDebts,
      settleNote: settleNewNote ? settleNewNote.trim() : undefined
    });
    if (result) {
      setSuccess(true);
      setInsertedDebts(result.insertedDebts);
    }
  };

  return createPortal(
    <div className="settings-backdrop smart-settlement-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal smart-settlement-modal scale-in" style={{ maxWidth: '500px' }}>
        <div className="settings-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Calculator size={24} color="var(--primary-color)" /> Smart Settlement
          </h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="settings-content" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {success ? (
            <>
              <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem 0' }}>
                <CheckCircle size={48} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
                <h3>Zoptymalizowano!</h3>
                {sortedInsertedDebts.length > 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Wygenerowano zoptymalizowane obciążenia zgodnie z algorytmem.</p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Bilans się zbilansował — stare długi zostały zamknięte.</p>
                )}
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Kto Komu Płaci (netto):</h4>

              {sortedInsertedDebts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>
                  Brak nowych pozycji do rozliczenia.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Dłużnik</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Wierzyciel</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Kwota</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInsertedDebts.map((d, idx) => {
                        const isSettled = splits.find(s => s.id === d.splitId)?.is_paid;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem 0.5rem', color: d.from === user?.id ? 'var(--error-color)' : 'var(--text-primary)', fontWeight: 600 }}>
                              {getMemberName(d.from)}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', color: d.to === user?.id ? 'var(--success-color)' : 'var(--text-primary)', fontWeight: 600 }}>
                              {getMemberName(d.to)}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}><span className="money-inline">{d.amount.toFixed(2)} zł</span></td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {isSettled ? (
                                <span style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 700 }}>Zapłacone</span>
                              ) : (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  onClick={() => setExpandedDetailsId(expandedDetailsId === d.expenseId ? null : d.expenseId)}
                                >
                                  <ChevronDown 
                                    size={14} 
                                    style={{ 
                                      transform: expandedDetailsId === d.expenseId ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s'
                                    }}
                                  />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {expandedDetailsId && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1.5rem', 
                  background: 'rgba(99,102,241,0.05)', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(99,102,241,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                    <h4 style={{ margin: 0 }}>Szczegóły wydatku</h4>
                    <button
                      onClick={() => setExpandedDetailsId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                    >
                      ✕
                    </button>
                  </div>
                  <ExpenseDetailsContent 
                    expense={expenses.find(e => e.id === expandedDetailsId) || null}
                    onDelete={() => setExpandedDetailsId(null)}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', margin: 0, fontSize: '0.875rem' }}>
                  <Info size={16} color="var(--primary-color)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                  <span>
                     System przeliczył wszystkie otwarte długi i wygenerował optymalną, najkrótszą sieć przelewów dla całej grupy. Zliczone operacje anulują stare, drobne rachunki.
                  </span>
                </p>
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Kto Komu Płaci (netto):</h4>
              
              {sortedOptimalTransactions.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Wszyscy są w rozliczeni na czysto!</p>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Dłużnik</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Wierzyciel</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'normal' }}>Kwota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedOptimalTransactions.map((t, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.75rem 0.5rem', color: t.from === user?.id ? 'var(--error-color)' : 'var(--text-primary)', fontWeight: 600 }}>
                                {getMemberName(t.from)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', color: t.to === user?.id ? 'var(--success-color)' : 'var(--text-primary)', fontWeight: 600 }}>
                                {getMemberName(t.to)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}><span className="money-inline">{t.amount.toFixed(2)} zł</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={settleNewDebts}
                            onChange={(e) => setSettleNewDebts(e.target.checked)}
                          />
                          <span style={{ fontWeight: 600 }}>Oznacz wygenerowane długi jako zapłacone</span>
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(opcjonalnie)</span>
                      </div>
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Pencil size={16} style={{ color: 'var(--text-secondary)' }} />
                        <input
                          className="input-field"
                          style={{ flex: 1, fontSize: '0.875rem' }}
                          disabled={!settleNewDebts}
                          value={settleNewNote}
                          onChange={(e) => setSettleNewNote(e.target.value)}
                          placeholder="Notatka (np. zapłacono w gotówce)"
                        />
                      </div>
                    </div>
                  </div>
              )}

              {sortedOptimalTransactions.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                      <button className="btn-primary" style={{ width: '100%' }} onClick={handleSimplify} disabled={isLoading}>
                          {isLoading ? 'Przetwarzanie...' : 'Zastosuj i Uprość Długi'}
                      </button>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
                          Kliknięcie usunie dotychczasowe wirtualne podziały i stworzy spłaszczone obciążenia zgodnie z listą powyżej.
                      </p>
                  </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
