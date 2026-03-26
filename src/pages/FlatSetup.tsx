import React, { useState } from 'react';
import { Home, UserPlus, KeyRound, AlertCircle } from 'lucide-react';
import { useFlatStore } from '../store/flatStore';
import { useAuthStore } from '../store/authStore';

export const FlatSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [flatName, setFlatName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { createFlat, joinFlat, isLoading, error } = useFlatStore();
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signOut } = useAuthStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!flatName.trim()) {
      setValidationError('Nazwa mieszkania nie może być pusta.');
      return;
    }
    await createFlat(flatName.trim());
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!inviteCode.trim()) {
      setValidationError('Kod zaproszenia nie może być pusty.');
      return;
    }
    if (inviteCode.trim().length !== 6) {
      setValidationError('Kod zaproszenia musi składać się z 6 znaków.');
      return;
    }
    await joinFlat(inviteCode.trim().toUpperCase());
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.25rem' }}>
            <Home size={32} color="var(--primary-color)" />
          </div>
          <h2>Ustawienia Mieszkania</h2>
          <p>Musisz utworzyć nowe mieszkanie lub dołączyć do istniejącego.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`btn-secondary ${activeTab === 'create' ? 'active-tab' : ''}`} 
            style={{ flex: 1, justifyContent: 'center', background: activeTab === 'create' ? 'rgba(99,102,241,0.2)' : '' }}
            onClick={() => setActiveTab('create')}
          >
            <Home size={18} /> Utwórz
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'join' ? 'active-tab' : ''}`}
            style={{ flex: 1, justifyContent: 'center', background: activeTab === 'join' ? 'rgba(99,102,241,0.2)' : '' }}
            onClick={() => setActiveTab('join')}
          >
            <UserPlus size={18} /> Dołącz
          </button>
        </div>

        {(error || validationError) && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{validationError || error}</span>
          </div>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>Nazwa Mieszkania</label>
              <input
                type="text"
                className="input-field"
                placeholder="np. Kwatera Główna, Akademik 404"
                value={flatName}
                onChange={(e) => setFlatName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Tworzenie...' : 'Utwórz Mieszkanie'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>Kod Zaproszenia</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '3rem', textTransform: 'uppercase' }}
                  placeholder="np. X9Y2ZA"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Dołączanie...' : 'Dołącz do Mieszkania'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button className="toggle-link" onClick={() => signOut()}>Wyloguj i wróć później</button>
        </div>
        
      </div>
    </div>
  );
};
