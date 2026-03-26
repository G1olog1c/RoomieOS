import React, { useEffect, useState } from 'react';
import { Home, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { SettingsModal } from '../components/SettingsModal';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { currentFlat } = useFlatStore();
  const [email, setEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user) setEmail(user.email || '');
  }, [user]);

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
            Zalogowano jako: <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </span>
          <button className="btn-secondary" onClick={() => setShowSettings(true)} title="Ustawienia">
            <Settings size={16} />
          </button>
          <button className="btn-secondary" onClick={handleSignOut}>
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
            <div className="glass-panel hover-card" style={{ padding: '1.5rem', height: '100%', cursor: 'pointer' }}>
              <h3>💸 Finanse</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Wejdź w moduł rozliczeń (Splitwise). Dodaj paragon i sprawdź bilans długów.</p>
            </div>
          </Link>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3>Obowiązki</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Tabela obowiązków Kanban lub lista. Wkrótce nadejdą zmiany.</p>
          </div>
          <Link to="/zakupy" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel hover-card" style={{ padding: '1.5rem', height: '100%', cursor: 'pointer' }}>
              <h3>🛒 Lista zakupów</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Dodawaj braki na wspólną tablicę i odhaczaj po stronie sklepu w czasie rzeczywistym.</p>
            </div>
          </Link>
        </div>
      </main>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
