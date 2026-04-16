import React, { useEffect, useState } from 'react';
import { Home, LogOut, Settings, Users, User, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { useNotificationStore } from '../store/notificationStore';
import { SettingsModal } from '../components/SettingsModal';
import { NotificationsModal } from '../components/NotificationsModal';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { currentFlat, members, removeMember } = useFlatStore();
  const { expensesRachunkiCount, shoppingCount, shoppingHasNew, fetchCounts } = useNotificationStore();
  const [email, setEmail] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (user) setEmail(user.email || '');
  }, [user]);

  useEffect(() => {
    if (currentFlat) {
      fetchCounts();
    }
  }, [currentFlat, fetchCounts]);

  const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="main-content animate-fade-in">
      <nav className="navbar">
        <div className="navbar-brand">
          <Home size={24} color="#6366f1" />
          <span>{currentFlat?.name || 'Roomies'}</span>
          {currentFlat && (
            <span style={{ 
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <Link to="/finanse" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card" style={{ padding: '1.5rem', height: '100%', cursor: 'pointer', position: 'relative' }}>
              {expensesRachunkiCount > 0 && (
                <span
                  className="notification-badge animate-fade-in"
                  role="button"
                  tabIndex={0}
                  aria-label={`Masz ${expensesRachunkiCount} nowych rachunków`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsNotificationsOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setIsNotificationsOpen(true);
                  }}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'var(--success-color)',
                    color: 'white',
                    borderRadius: '999px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: 0,
                    marginLeft: 0,
                  }}
                >
                  {expensesRachunkiCount}
                </span>
              )}
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 💸 Finanse
              </h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Wejdź w moduł rozliczeń (Splitwise). Dodaj paragon i sprawdź bilans długów.</p>
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
            <div className="glass-panel hover-card" style={{ padding: '1.5rem', height: '100%', cursor: 'pointer', position: 'relative' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🛒 Lista zakupów
                  {shoppingCount > 0 && (
                     <span
                       className="notification-badge animate-fade-in"
                       role="button"
                       tabIndex={0}
                       onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setIsNotificationsOpen(true);
                       }}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' || e.key === ' ') setIsNotificationsOpen(true);
                       }}
                       style={{
                         background: shoppingHasNew ? 'var(--success-color)' : 'rgba(255, 255, 255, 0.1)',
                         color: shoppingHasNew ? 'white' : 'var(--text-secondary)',
                         borderRadius: '12px',
                         padding: '0.1rem 0.5rem',
                         fontSize: '0.75rem',
                         fontWeight: 'bold',
                         marginLeft: 'auto',
                         border: shoppingHasNew ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
                     }}>
                         {shoppingCount} {shoppingCount === 1 ? 'rzecz' : (shoppingCount >= 2 && shoppingCount <= 4 ? 'rzeczy' : 'rzeczy')}
                     </span>
                 )}
              </h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Dodawaj braki na wspólną tablicę i odhaczaj po stronie sklepu w czasie rzeczywistym.</p>
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
