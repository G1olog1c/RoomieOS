import React, { useEffect, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import {
    ArrowLeft,
    Plus,
    CircleDollarSign,
    AlertCircle,
    Info,
    Calculator,
    FileText,
    Search,
    User,
    SlidersHorizontal,
    RotateCcw,
    Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SmartSettlementModal } from '../components/SmartSettlementModal';
import { ExpandableTransactionRow } from '../components/ExpandableTransactionRow';

export const ExpensesPage: React.FC = () => {
    const { expenses, splits, isLoading, fetchExpenses, addExpense } = useExpenseStore();
    const { members } = useFlatStore();
    const { user } = useAuthStore();

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [expenseType, setExpenseType] = useState<'Zakupy' | 'Rachunki' | 'Inne'>('Zakupy');
    const [isAdding, setIsAdding] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
    const [isSettlementOpen, setIsSettlementOpen] = useState(false);
    const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

    const [filterText, setFilterText] = useState('');
    const [filterPerson, setFilterPerson] = useState('');
    const [filterExpenseType, setFilterExpenseType] = useState<'all' | 'Zakupy' | 'Rachunki' | 'Inne'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { markAsSeen } = useNotificationStore();

    useEffect(() => {
        fetchExpenses();
        markAsSeen('expenses');
    }, [fetchExpenses, markAsSeen]);

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
        const success = await addExpense(title.trim(), numAmount, memberIds, expenseType);
        if (success) {
            setTitle('');
            setAmount('');
            setExpenseType('Zakupy');
            setIsAdding(false);
            setValidationError(null);
        } else {
            setValidationError('Wystąpił błąd podczas dodawania wydatku.');
        }
    };

    const iOweSplits = splits.filter(s => s.user_id === user?.id && !s.is_paid && expenses.find(e => e.id === s.expense_id)?.payer_id !== user?.id);
    const owedToMeSplits = splits.filter(s => expenses.find(e => e.id === s.expense_id)?.payer_id === user?.id && !s.is_paid && s.user_id !== user?.id);

    const getMemberName = (userId: string | undefined) => {
        if (!userId) return 'Nieznany element';
        if (userId === user?.id) return 'Ty';
        const member = members.find(m => m.user_id === userId);
        return member?.display_name || member?.email || `Lokator ${userId.substring(0, 4)}`;
    };

    const filteredExpenses = expenses.filter(exp => {
        const matchesText = exp.title.toLowerCase().includes(filterText.toLowerCase());
        const matchesPerson = filterPerson ? exp.payer_id === filterPerson : true;
        const matchesType = filterExpenseType !== 'all' ? (exp.expense_type || 'Zakupy') === filterExpenseType : true;

        let matchesDateExp = true;
        const expDate = new Date(exp.created_at).getTime();
        if (dateFrom) matchesDateExp = matchesDateExp && expDate >= new Date(dateFrom).getTime();
        if (dateTo) {
            const endOfDay = new Date(dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            matchesDateExp = matchesDateExp && expDate <= endOfDay.getTime();
        }

        let matchesStatus = true;
        if (statusFilter !== 'all') {
            const expSplits = splits.filter(s => s.expense_id === exp.id);
            const hasUnpaid = expSplits.some(s => !s.is_paid);
            if (statusFilter === 'open') matchesStatus = hasUnpaid;
            if (statusFilter === 'closed') matchesStatus = !hasUnpaid;
        }

        return matchesText && matchesPerson && matchesType && matchesDateExp && matchesStatus;
    });

    const filteredOpenCount = filteredExpenses.filter(exp => splits.some(s => s.expense_id === exp.id && !s.is_paid)).length;
    const activeHistoryFiltersCount = [filterText, filterPerson, filterExpenseType !== 'all', dateFrom, dateTo, statusFilter !== 'all'].filter(Boolean).length;

    const totalOwe = iOweSplits.reduce((acc, s) => acc + s.amount, 0);

    const fiveDaysAgoTs = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const oldOweSplits = iOweSplits.filter(s => new Date(s.created_at).getTime() < fiveDaysAgoTs);
    const totalOldOwe = oldOweSplits.reduce((acc, s) => acc + s.amount, 0);

    const activeDebtsCount = splits.filter(s => !s.is_paid && expenses.find(e => e.id === s.expense_id)?.payer_id !== s.user_id).length;
    const optimalCount = useExpenseStore.getState().calculateOptimalDebts().length;
    const canSimplify = activeDebtsCount > optimalCount;

    const currentMonth = new Date().getMonth();
    const statsThisMonth = members.map(m => {
        const spent = expenses
            .filter(e => e.payer_id === m.user_id && new Date(e.created_at).getMonth() === currentMonth)
            .reduce((sum, e) => sum + e.amount, 0);
        return { name: getMemberName(m.user_id), spent, id: m.user_id };
    }).sort((a, b) => b.spent - a.spent);

    const exportToCSV = () => {
        const headers = ['Data', 'Typ', 'Tytul', 'Zaplacil', 'Kwota', 'Status'];
        const rows = filteredExpenses.map(exp => {
            const dateStr = new Date(exp.created_at).toLocaleDateString('pl-PL');
            const safeTitle = `"${exp.title.replace(/"/g, '""')}"`;
            const safeType = `"${(exp.expense_type || 'Zakupy').replace(/"/g, '""')}"`;
            const payer = `"${getMemberName(exp.payer_id)}"`;
            const isOpen = splits.some(s => s.expense_id === exp.id && !s.is_paid);
            const status = isOpen ? 'Otwarte' : 'Zamkniete';
            return [dateStr, safeType, safeTitle, payer, exp.amount.toFixed(2), status].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `historia_rozliczen_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetHistoryFilters = () => {
        setFilterText('');
        setFilterPerson('');
        setFilterExpenseType('all');
        setDateFrom('');
        setDateTo('');
        setStatusFilter('all');
    };

    return (
        <div className="main-content animate-fade-in page-shell expenses-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/">
                    <button className="btn-secondary" style={{ padding: '0.6rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                </Link>
                <h2>Moduł Finansów (Splitwise)</h2>
            </div>

            <div className="settings-tabs" style={{ marginBottom: '2rem' }}>
                <button
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    <AlertCircle size={18} /> Podsumowanie
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <FileText size={18} /> Historia Rozliczeń
                </button>
            </div>

            {activeTab === 'summary' && (
                <div className="animate-fade-in expenses-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Twój bilans (Długi)</h3>
                            <button className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsSettlementOpen(true)}>
                                <Calculator size={16} /> Rozlicz Mieszkańców
                            </button>
                        </div>

                        {totalOwe > 0 && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <AlertCircle size={24} color="var(--error-color)" />
                                <div>
                                    <strong style={{ color: 'var(--error-color)' }}>Uwaga!</strong>
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>Masz {iOweSplits.length} otwarte długi na całkowitą sumę <strong className="money-inline">{totalOwe.toFixed(2)} zł</strong>.</p>
                                </div>
                            </div>
                        )}

                        {totalOwe > 0 && oldOweSplits.length > 0 && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <AlertCircle size={24} color="rgb(245, 158, 11)" />
                                <div>
                                    <strong style={{ color: 'rgb(245, 158, 11)' }}>Przypomnienie!</strong>
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                        Masz {oldOweSplits.length} otwarte długi od ponad 5 dni na sumę <strong className="money-inline">{totalOldOwe.toFixed(2)} zł</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {canSimplify && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Info size={24} color="var(--success-color)" />
                                <div>
                                    <strong style={{ color: 'var(--success-color)' }}>Możesz zredukować przelewy!</strong>
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>System znalazł możliwość uproszczenia długów dla całej grupy (z {activeDebtsCount} do {optimalCount} operacji).</p>
                                    <button onClick={() => setIsSettlementOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--success-color)', textDecoration: 'underline', padding: 0, marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>Uprość Długi Algorytmicznie</button>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Musisz oddać:</h4>
                            {iOweSplits.length === 0 ? <p style={{ fontSize: '0.875rem' }}>Jesteś na czysto!</p> : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {iOweSplits.map(split => {
                                        const exp = expenses.find(e => e.id === split.expense_id);
                                        return (
                                            <li key={split.id} className="expense-balance-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <strong>{exp?.title}</strong><br />
                                                    <small style={{ color: 'var(--text-secondary)' }}>Osobie: {getMemberName(exp?.payer_id)}</small>
                                                </div>
                                                <div className="expense-balance-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span className="money-inline" style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{split.amount.toFixed(2)} zł</span>
                                                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '8px' }} onClick={() => {
                                                        setActiveTab('history');
                                                        setExpandedExpenseId(exp?.id || null);
                                                    }}>
                                                        Zapłać / Detale
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            <h4 style={{ color: 'var(--success-color)', marginTop: '2.5rem', marginBottom: '1rem' }}>Inni wiszą Tobie:</h4>
                            {owedToMeSplits.length === 0 ? <p style={{ fontSize: '0.875rem' }}>Nikt nie ma wobec Ciebie długów.</p> : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {owedToMeSplits.map(split => {
                                        const exp = expenses.find(e => e.id === split.expense_id);
                                        return (
                                            <li key={split.id} className="expense-balance-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <strong>{exp?.title}</strong><br />
                                                    <small style={{ color: 'var(--text-secondary)' }}>Wiszący: {getMemberName(split.user_id)}</small>
                                                </div>
                                                <div className="expense-balance-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span className="money-inline" style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{split.amount.toFixed(2)} zł</span>
                                                    <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '8px', opacity: 0.8 }} onClick={() => {
                                                        setActiveTab('history');
                                                        setExpandedExpenseId(exp?.id || null);
                                                    }}>
                                                        Oznacz / Szczegóły
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                                        <label>Typ</label>
                                        <select
                                            className="input-field"
                                            value={expenseType}
                                            onChange={(e) => setExpenseType(e.target.value as 'Zakupy' | 'Rachunki' | 'Inne')}
                                        >
                                            <option value="Zakupy">Zakupy</option>
                                            <option value="Rachunki">Rachunki</option>
                                            <option value="Inne">Inne</option>
                                        </select>
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

                        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(99,102,241,0.05)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.1)' }}>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Miesięczne Statystyki</h4>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {statsThisMonth.map(stat => (
                                    <li key={stat.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{stat.name}</span>
                                        <strong className="money-inline" style={{ color: 'var(--primary-color)' }}>{stat.spent.toFixed(2)} zł</strong>
                                    </li>
                                ))}
                                {statsThisMonth.length === 0 && <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Brak wydatków w tym miesiącu.</span>}
                            </ul>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {expenses.slice(0, 5).map(exp => (
                                    <li
                                        key={exp.id}
                                        onClick={() => {
                                            setActiveTab('history');
                                            setExpandedExpenseId(exp.id);
                                        }}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 0', borderBottom: '1px solid var(--surface-border)', opacity: 0.9, transition: '0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '0.9'}
                                    >
                                        <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                            <CircleDollarSign color="var(--primary-color)" size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0' }}>{exp.title}</h4>
                                            <small style={{ color: 'var(--text-secondary)' }}>Kupił: {getMemberName(exp.payer_id)}</small>
                                        </div>
                                        <span className="money-inline" style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{exp.amount.toFixed(2)} zł</span>
                                    </li>
                                ))}
                                {expenses.length > 5 && (
                                    <button className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setActiveTab('history')}>Pokaż pełną historię</button>
                                )}
                                {expenses.length === 0 && !isLoading && (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Brak historii wydatków w tym mieszkaniu.</p>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                    <div className="expenses-history-shell">
                        <div className="expenses-history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.35rem' }}>Historia Rozliczeń</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Przeglądaj wydatki, zawężaj listę po statusie i szybko otwieraj szczegóły rozliczeń.
                                </p>
                            </div>
                            <div className="expenses-history-summary">
                                <div className="expenses-history-stat">
                                    <span className="expenses-history-stat-label">Wyniki</span>
                                    <strong>{filteredExpenses.length}</strong>
                                </div>
                                <div className="expenses-history-stat">
                                    <span className="expenses-history-stat-label">Otwarte</span>
                                    <strong>{filteredOpenCount}</strong>
                                </div>
                                <div className="expenses-history-stat">
                                    <span className="expenses-history-stat-label">Filtry</span>
                                    <strong>{activeHistoryFiltersCount}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="expenses-history-filters-panel">
                            <div className="expenses-history-filters-header">
                                <div className="expenses-history-filters-title">
                                    <SlidersHorizontal size={18} color="var(--primary-color)" />
                                    <span>Filtry i eksport</span>
                                </div>
                                <div className="expenses-history-actions">
                                    <button className="btn-secondary" style={{ padding: '0.65rem 1rem' }} onClick={resetHistoryFilters}>
                                        <RotateCcw size={16} /> Wyczyść
                                    </button>
                                    <button className="btn-secondary" style={{ padding: '0.65rem 1rem' }} onClick={exportToCSV}>
                                        <Download size={16} /> Pobierz CSV
                                    </button>
                                </div>
                            </div>

                            <div className="expenses-history-search-row">
                                <div className="input-group expenses-history-search" style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Szukaj po nazwie wydatku..."
                                        className="input-field"
                                        style={{ paddingLeft: '2.75rem' }}
                                        value={filterText}
                                        onChange={e => setFilterText(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="expenses-history-filters-grid">
                                <div className="input-group" style={{ position: 'relative' }}>
                                    <label>Kupujący</label>
                                    <User size={16} style={{ position: 'absolute', top: '42px', left: '12px', color: 'var(--text-secondary)' }} />
                                    <select
                                        className="input-field"
                                        style={{ paddingLeft: '2.75rem', appearance: 'none' }}
                                        value={filterPerson}
                                        onChange={e => setFilterPerson(e.target.value)}
                                    >
                                        <option value="">Wszyscy kupujący</option>
                                        {members.map(m => (
                                            <option key={m.user_id} value={m.user_id}>{m.display_name || m.email || `Konto ${m.user_id.substring(0, 4)}`}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Status</label>
                                    <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                        <option value="all">Wszystkie statusy</option>
                                        <option value="open">Otwarte (Nieopłacone)</option>
                                        <option value="closed">Zakończone (Spłacone)</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Typ wydatku</label>
                                    <select
                                        className="input-field"
                                        value={filterExpenseType}
                                        onChange={(e) => setFilterExpenseType(e.target.value as 'all' | 'Zakupy' | 'Rachunki' | 'Inne')}
                                    >
                                        <option value="all">Wszystkie typy</option>
                                        <option value="Zakupy">Zakupy</option>
                                        <option value="Rachunki">Rachunki</option>
                                        <option value="Inne">Inne</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Data od</label>
                                    <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                                </div>

                                <div className="input-group">
                                    <label>Data do</label>
                                    <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="expenses-history-table-card">
                            <div className="expenses-history-table-header">
                                <div>
                                    <h4 style={{ marginBottom: '0.25rem' }}>Wyniki wyszukiwania</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Kliknij wiersz, aby rozwinąć szczegóły wydatku i zarządzać rozliczeniem.
                                    </p>
                                </div>
                                <span className="expenses-history-results-pill">
                                    {filteredExpenses.length} {filteredExpenses.length === 1 ? 'pozycja' : (filteredExpenses.length >= 2 && filteredExpenses.length <= 4 ? 'pozycje' : 'pozycji')}
                                </span>
                            </div>

                            <div className="expenses-history-table-scroll" style={{ overflowX: 'auto' }}>
                                <table className="expenses-history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Data</th>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Typ</th>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Opis</th>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Zapłacił(a)</th>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Kwota (zł)</th>
                                            <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredExpenses.map(exp => (
                                            <ExpandableTransactionRow
                                                key={exp.id}
                                                expense={exp}
                                                isExpanded={expandedExpenseId === exp.id}
                                                onToggle={() => setExpandedExpenseId(expandedExpenseId === exp.id ? null : exp.id)}
                                            />
                                        ))}
                                        {filteredExpenses.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                                                    Brak wyników dla obecnych filtrów. Spróbuj poszerzyć zakres wyszukiwania.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SmartSettlementModal
                isOpen={isSettlementOpen}
                onClose={() => setIsSettlementOpen(false)}
            />
        </div>
    );
};
