import React, { useEffect, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Plus, CircleDollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ExpensesPage: React.FC = () => {
    const { expenses, splits, isLoading, fetchExpenses, addExpense, settleDebt } = useExpenseStore();
    const { members } = useFlatStore();
    const { user } = useAuthStore();
    
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    
    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        
        if (!title.trim()) {
            setValidationError('Tytuł wydatku nie może być pusty.');
            return;
        }

        const numAmount = parseFloat(amount);
        if (Number.isNaN(numAmount) || numAmount <= 0) {
            setValidationError('Podaj poprawną kwotę większą od zera.');
            return;
        }
        
        const memberIds = members.map(m => m.user_id);
        const success = await addExpense(title.trim(), numAmount, memberIds);
        if (success) {
            setTitle('');
            setAmount('');
            setIsAdding(false);
            setValidationError(null);
        } else {
            setValidationError('Wystąpił błąd podczas dodawania wydatku.');
        }
    };
    
    const iOweSplits = splits.filter(s => s.user_id === user?.id && !s.is_paid && expenses.find(e => e.id === s.expense_id)?.payer_id !== user?.id);
    const owedToMeSplits = splits.filter(s => expenses.find(e => e.id === s.expense_id)?.payer_id === user?.id && !s.is_paid && s.user_id !== user?.id);

    return (
        <div className="main-content animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/">
                    <button className="btn-secondary" style={{ padding: '0.6rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                </Link>
                <h2>Moduł Finansów (Splitwise)</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3>Twój bilans (Długi)</h3>
                    <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Musisz oddać:</h4>
                        {iOweSplits.length === 0 ? <p style={{ fontSize: '0.875rem' }}>Jesteś na czysto!</p> : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {iOweSplits.map(split => {
                                    const exp = expenses.find(e => e.id === split.expense_id);
                                    return (
                                        <li key={split.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '0.75rem' }}>
                                            <div>
                                                <strong>{exp?.title}</strong><br/>
                                                <small style={{ color: 'var(--text-secondary)' }}>Osobie: Lokator {exp?.payer_id.substring(0,4)}</small>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{split.amount.toFixed(2)} zł</span>
                                                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '8px' }} onClick={() => settleDebt(split.id)}>
                                                    Zapłać
                                                </button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                        
                        <h4 style={{ color: 'var(--success-color)', marginTop: '2.5rem', marginBottom: '1rem' }}>Inni wiszą Tobie:</h4>
                        {owedToMeSplits.length === 0 ? <p style={{ fontSize: '0.875rem' }}>Nikt nie ma wobec Ciebie długów.</p> : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {owedToMeSplits.map(split => {
                                    const exp = expenses.find(e => e.id === split.expense_id);
                                    return (
                                        <li key={split.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', marginBottom: '0.75rem' }}>
                                            <div>
                                                <strong>{exp?.title}</strong><br/>
                                                <small style={{ color: 'var(--text-secondary)' }}>Wiszący: Lokator {split.user_id.substring(0,4)}</small>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{split.amount.toFixed(2)} zł</span>
                                                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '8px', opacity: 0.8 }} onClick={() => settleDebt(split.id)}>
                                                    Oznacz Płatność
                                                </button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Ostatnie paragony</h3>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '8px' }} onClick={() => setIsAdding(!isAdding)}>
                            <Plus size={16} /> Dodaj rachunek
                        </button>
                    </div>
                    
                    {isAdding && (
                        <div className="animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Nowy wydatek</h4>
                            {validationError && (
                                <div className="error-message" style={{ marginBottom: '1rem', marginTop: 0 }}>
                                    <AlertCircle size={16} />
                                    <span>{validationError}</span>
                                </div>
                            )}
                            <form onSubmit={handleAdd}>
                                <div className="form-group">
                                    <label>Zapas, Usługa, itp. (Tytuł)</label>
                                    <input type="text" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="np. Zakupy Środowe w Lidlu" />
                                </div>
                                <div className="form-group">
                                    <label>Kwota łączna (zł)</label>
                                    <input type="number" step="0.01" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="np. 120.50" />
                                </div>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
                                    {isLoading ? 'Rozdzielanie proporcjonalne...' : 'Podziel na lokatorów'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {expenses.map(exp => (
                                <li key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                                    <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <CircleDollarSign color="var(--primary-color)" size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 0.25rem 0' }}>{exp.title}</h4>
                                        <small style={{ color: 'var(--text-secondary)' }}>Kupił: {exp.payer_id === user?.id ? 'Ty' : `Lokator ${exp.payer_id.substring(0,4)}`}</small>
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{exp.amount.toFixed(2)} zł</span>
                                </li>
                            ))}
                            {expenses.length === 0 && !isLoading && (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Brak historii wydatków w tym mieszkaniu.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
