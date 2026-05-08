import React, { useEffect, useState } from 'react';
import { Home, LogOut, Settings, Users, User, UserX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { useExpenseStore } from '../store/expenseStore';
import { useShoppingStore } from '../store/shoppingStore';
import { useChoreStore } from '../store/choreStore';
import { useNotificationStore } from '../store/notificationStore';
import { SettingsModal } from '../components/SettingsModal';
import { NotificationsModal } from '../components/NotificationsModal';

function formatNewExpensesBadge(n: number): string {
  if (n === 1) return '1 nowy';
  if (n >= 2 && n <= 4) return `${n} nowe`;
  return `${n} nowych`;
}

function formatTasksBadge(n: number): string {
  if (n === 1) return '1 zadanie';
  if (n >= 2 && n <= 4) return `${n} zadania`;
  return `${n} zadań`;
}

function formatUnreadMessagesBadge(n: number): string {
  if (n === 1) return '1 nowa';
  if (n >= 2 && n <= 4) return `${n} nowe`;
  return `${n} nowych`;
}

type DashboardNotifyPillProps = {
  show: boolean;
  label: string;
  highlight: boolean;
  ariaLabel: string;
  onOpen: () => void;
};

const DashboardNotifyPill: React.FC<DashboardNotifyPillProps> = ({ show, label, highlight, ariaLabel, onOpen }) => {
  if (!show) return null;
  return (
    <span
      className="notification-badge animate-fade-in"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        background: highlight ? 'var(--success-color)' : 'rgba(255, 255, 255, 0.1)',
        color: highlight ? 'white' : 'var(--text-secondary)',
        borderRadius: '12px',
        padding: '0.1rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        marginLeft: 'auto',
        flexShrink: 0,
        border: highlight ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {label}
    </span>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { currentFlat, members, removeMember } = useFlatStore();
  const {
    expensesCount,
    shoppingCount,
    shoppingHasNew,
    choresCount,
    choresHasNew,
    chatUnreadCount,
    chatHasNew,
    fetchCounts,
  } = useNotificationStore();
  const { expenses, splits, fetchExpenses } = useExpenseStore();
  const { items: shoppingItems, fetchItems } = useShoppingStore();
  const { chores, fetchChores } = useChoreStore();
  const [email, setEmail] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (user) setEmail(user.email || '');
  }, [user]);

  useEffect(() => {
    if (currentFlat) {
      fetchCounts();
      fetchExpenses();
      fetchItems();
      fetchChores();
    }
  }, [currentFlat, fetchCounts, fetchExpenses, fetchItems, fetchChores]);

  const pendingShoppingItems = shoppingItems.filter(item => !item.is_completed);
  const shoppingPreviewItems = pendingShoppingItems.slice(0, 3);
  const shoppingSummaryText = pendingShoppingItems.length > 0
    ? `${pendingShoppingItems.length} niekupionych pozycji`
    : 'Brak niekupionych przedmiotów';

  const pendingChores = chores.filter((c) => c.status !== 'done').sort((a, b) => {
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const choresPreview = pendingChores.slice(0, 3);
  const n = pendingChores.length;
  const choresSummaryText =
    n === 0
      ? 'Brak aktywnych obowiązków'
      : n === 1
        ? '1 zadanie do zrobienia'
        : n >= 2 && n <= 4
          ? `${n} zadania do zrobienia`
          : `${n} zadań do zrobienia`;

  const currentUserId = user?.id;
  const totalOwe = splits
    .filter(split => !split.is_paid && split.user_id === currentUserId)
    .reduce((sum, split) => {
      const expense = expenses.find(exp => exp.id === split.expense_id);
      return expense && expense.payer_id !== split.user_id ? sum + split.amount : sum;
    }, 0);

  const totalOwedToMe = splits
    .filter(split => !split.is_paid)
    .reduce((sum, split) => {
      const expense = expenses.find(exp => exp.id === split.expense_id);
      return expense && expense.payer_id === currentUserId && expense.payer_id !== split.user_id ? sum + split.amount : sum;
    }, 0);

  const financeSummaryText = totalOwe > 0
    ? `Masz do zapłaty ${totalOwe.toFixed(2)} zł`
    : totalOwedToMe > 0
      ? `Masz do odebrania ${totalOwedToMe.toFixed(2)} zł`
      : 'Brak otwartych długów';

  const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  const openNotifications = () => setIsNotificationsOpen(true);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="main-content animate-fade-in dashboard-page">
      <nav className="navbar">
        <div className="navbar-brand dashboard-navbar-brand">
          <Home size={24} color="#6366f1" />
          <span>{currentFlat?.name || 'Roomies'}</span>
          {currentFlat && (
            <span className="dashboard-invite-chip" style={{ 
              fontSize: '0.75rem', 
              background: 'rgba(99,102,241,0.1)', 
              color: 'var(--primary-color)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(99,102,241,0.2)',
              marginLeft: '0.5rem'
            }}>
              Kod zaproszenia: <strong style={{ letterSpacing: '1px' }}>{currentFlat.invite_code}</strong>
            </span>
          )}
        </div>
        <div className="dashboard-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="dashboard-user-label" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Zalogowano jako: <strong style={{ color: 'var(--text-primary)' }}>{user?.user_metadata?.display_name || email}</strong>
          </span>
          <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)} style={{ padding: '0.5rem', width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Ustawienia">
            <Settings size={18} />
          </button>
          <button className="btn-secondary" onClick={handleSignOut} style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} />
            Wyloguj
          </button>
        </div>
      </nav>
      
      <main className="dashboard-layout">
        <div className="greeting">
          <h2>Witaj w Roomies!</h2>
          <p>Twoje mieszkanie w jednym miejscu.</p>
        </div>
        
        <div className="dashboard-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <Link to="/finanse" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card dashboard-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                💸 Finanse
                <DashboardNotifyPill
                  show={expensesCount > 0}
                  label={formatNewExpensesBadge(expensesCount)}
                  highlight={expensesCount > 0}
                  ariaLabel={
                    expensesCount === 1
                      ? 'Jedno nowe rozliczenie — otwórz powiadomienia'
                      : `${expensesCount} nowych rozliczeń — otwórz powiadomienia`
                  }
                  onOpen={openNotifications}
                />
              </h3>
              <div className="dashboard-card-summary">
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Szybki stan finansów</strong>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>{financeSummaryText}</p>
              </div>
              <p className="dashboard-card-footer">Kliknij, aby zobaczyć szczegóły rozliczeń i pełny bilans długów.</p>
            </div>
          </Link>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--primary-color)" /> Lokatorzy ({members.length})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {members.map(member => (
                    <li key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <User size={20} color="var(--primary-color)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                {member.display_name || member.email || `Konto ${member.user_id.substring(0,4)}`}
                                {member.user_id === user?.id && <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Ty)</span>}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {member.role === 'admin' ? 'Administrator' : 'Lokator'}
                            </span>
                        </div>
                        {isAdmin && member.user_id !== user?.id && (
                            <button 
                                onClick={() => {
                                    if(window.confirm('Na pewno chcesz wyrzucić tego lokatora z mieszkania? Utraci on natychmiastowy dostęp do wszystkich Twoich zakładek.')) {
                                        removeMember(member.user_id);
                                    }
                                }} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                                title="Wyrzuć lokatora"
                            >
                                <UserX size={18} />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
          </div>
          <Link to="/zakupy" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card dashboard-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                🛒 Lista zakupów
                <DashboardNotifyPill
                  show={shoppingCount > 0}
                  label={`${shoppingCount} ${shoppingCount === 1 ? 'rzecz' : 'rzeczy'}`}
                  highlight={shoppingHasNew}
                  ariaLabel={
                    shoppingCount === 1
                      ? 'Jedna pozycja na liście zakupów — otwórz powiadomienia'
                      : `${shoppingCount} pozycji na liście zakupów — otwórz powiadomienia`
                  }
                  onOpen={openNotifications}
                />
              </h3>
              <div className="dashboard-card-preview">
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Nie kupiono jeszcze</strong>
                {pendingShoppingItems.length > 0 ? (
                  <ul>
                    {shoppingPreviewItems.map(item => (
                      <li key={item.id} className="dashboard-card-preview-item">• {item.title}</li>
                    ))}
                    {pendingShoppingItems.length > shoppingPreviewItems.length && (
                      <li style={{ marginTop: '0.5rem', fontWeight: 600 }}>i jeszcze {pendingShoppingItems.length - shoppingPreviewItems.length} innych</li>
                    )}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{shoppingSummaryText}</p>
                )}
              </div>
              <p className="dashboard-card-footer">Kliknij kartę, aby przejść do pełnej listy zakupów.</p>
            </div>
          </Link>
          <Link to="/harmonogram" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card dashboard-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                📋 Harmonogram obowiązków
                <DashboardNotifyPill
                  show={choresCount > 0}
                  label={formatTasksBadge(choresCount)}
                  highlight={choresHasNew}
                  ariaLabel={
                    choresCount === 1
                      ? 'Jedno aktywne zadanie — otwórz powiadomienia'
                      : `${choresCount} aktywnych zadań — otwórz powiadomienia`
                  }
                  onOpen={openNotifications}
                />
              </h3>
              <div className="dashboard-card-preview">
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Nadchodzące zadania</strong>
                {pendingChores.length > 0 ? (
                  <ul>
                    {choresPreview.map((c) => (
                      <li key={c.id} className="dashboard-card-preview-item">
                        • {c.title}
                        {c.due_date && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>
                            {' '}
                            (
                            {new Date(c.due_date).toLocaleString('pl-PL', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            )
                          </span>
                        )}
                      </li>
                    ))}
                    {pendingChores.length > choresPreview.length && (
                      <li style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                        i jeszcze {pendingChores.length - choresPreview.length} innych
                      </li>
                    )}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{choresSummaryText}</p>
                )}
              </div>
              <p className="dashboard-card-footer">Sprzątanie, śmieci i inne — przypisania i terminy w jednym miejscu.</p>
            </div>
          </Link>
          <Link to="/czat" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card dashboard-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                💬 Czat lokatorów
                <DashboardNotifyPill
                  show={chatUnreadCount > 0}
                  label={formatUnreadMessagesBadge(chatUnreadCount)}
                  highlight={chatHasNew}
                  ariaLabel={
                    chatUnreadCount === 1
                      ? 'Jedna nieprzeczytana wiadomość — przejdź do czatu'
                      : `${chatUnreadCount} nieprzeczytanych wiadomości — przejdź do czatu`
                  }
                  onOpen={() => navigate('/czat')}
                />
              </h3>
              <div className="dashboard-card-preview">
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Rozmowa w mieszkaniu</strong>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Wspólny kanał jak w komunikatorze — wiadomości na żywo, bez wychodzenia z aplikacji.
                </p>
              </div>
              <p className="dashboard-card-footer">Kliknij, aby otworzyć czat z lokatorami.</p>
            </div>
          </Link>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};
