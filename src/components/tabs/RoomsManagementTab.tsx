import React, { useState } from 'react';
import { AlertCircle, Check, Plus } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore';

interface RoomsManagementTabProps {
  onCreateNewRoom?: () => void;
  onCloseModal?: () => void;
}

export const RoomsManagementTab: React.FC<RoomsManagementTabProps> = ({ onCreateNewRoom, onCloseModal }) => {
  const { currentFlat, leaveFlat, joinFlat, members } = useFlatStore();
  
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleJoinRoom = async () => {
    setMessage(null);

    if (!inviteCode.trim()) {
      setMessage({ type: 'error', text: 'Wpisz kod zaproszenia.' });
      return;
    }

    setIsJoining(true);
    try {
      const success = await joinFlat(inviteCode);
      if (success) {
        setMessage({ type: 'success', text: 'Pomyślnie dołączyłeś do pokoju!' });
        setInviteCode('');
        // Close modal after 1.5 seconds to show success message
        setTimeout(() => {
          onCloseModal?.();
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Błąd podczas dołączania do pokoju.' });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (window.confirm('Czy na pewno chcesz opuścić ten pokój?')) {
      setIsLeaving(true);
      try {
        await leaveFlat();
        setMessage({ type: 'success', text: 'Opuściłeś pokój.' });
        // Close modal after 1.5 seconds to show success message
        setTimeout(() => {
          onCloseModal?.();
        }, 1500);
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Błąd podczas opuszczania pokoju.' });
      } finally {
        setIsLeaving(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {message && (
        <div
          className={message.type === 'error' ? 'error-message' : 'success-message'}
          style={{ marginBottom: '0.5rem' }}
        >
          {message.type === 'error' && <AlertCircle size={16} />}
          {message.type === 'success' && <Check size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Room Section */}
      <div>
        <h3 style={{ marginBottom: '1rem' }}>Twój pokój</h3>
        {currentFlat ? (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Nazwa pokoju
              </p>
              <p style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600' }}>{currentFlat.name}</p>
            </div>

            <div>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Kod zaproszenia
              </p>
              <p
                style={{
                  margin: '0',
                  fontSize: '1rem',
                  fontWeight: '500',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  color: 'var(--primary-color)',
                }}
              >
                {currentFlat.invite_code}
              </p>
            </div>

            <div>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Liczba członków
              </p>
              <p style={{ margin: '0', fontSize: '1rem', fontWeight: '500' }}>{members.length}</p>
            </div>

            <button
              className="btn-secondary"
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              style={{
                marginTop: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error-color)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {isLeaving ? 'Opuszczanie...' : 'Opuść pokój'}
            </button>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ margin: '0', marginBottom: '0.5rem' }}>Nie należysz do żadnego pokoju.</p>
            <p style={{ margin: '0', fontSize: '0.875rem' }}>Dołącz do istniejącego pokoju lub utwórz nowy.</p>
          </div>
        )}
      </div>

      {/* Join Room Section */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Dołącz do pokoju</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Kod zaproszenia</label>
            <input
              className="input-field"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Wpisz 6-znakowy kod zaproszenia"
              maxLength={6}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Poproś członka pokoju o kod zaproszenia.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={handleJoinRoom}
            disabled={isJoining || !inviteCode.trim()}
          >
            {isJoining ? 'Dołączanie...' : 'Dołącz'}
          </button>
        </div>
      </div>

      {/* Create New Room Section */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Utwórz nowy pokój</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
          Lub utwórz nowy pokój i zaproś do niego innych użytkowników.
        </p>
        <button
          className="btn-primary"
          onClick={onCreateNewRoom}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          Utwórz nowy pokój
        </button>
      </div>
    </div>
  );
};
