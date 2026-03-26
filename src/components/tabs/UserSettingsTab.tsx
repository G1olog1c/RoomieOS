import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const UserSettingsTab: React.FC = () => {
  const { user, updateUserProfile, changePassword } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Messages
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  // Load current profile data
  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name || '');
      setLastName(user.user_metadata.last_name || '');
      setUsername(user.user_metadata.username || '');
    }
  }, [user]);

  const handleProfileSave = async () => {
    setProfileMessage(null);
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setProfileMessage({ type: 'error', text: 'Wszystkie pola są wymagane.' });
      return;
    }

    setIsLoadingProfile(true);
    try {
      await updateUserProfile(firstName, lastName, username);
      setProfileMessage({ type: 'success', text: 'Profil zaktualizowany pomyślnie!' });
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Błąd podczas aktualizacji profilu.' });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Wszystkie pola są wymagane.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Nowe hasło musi zawierać co najmniej 6 znaków.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Hasła nie są identyczne.' });
      return;
    }

    setIsLoadingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Hasło zmienione pomyślnie!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditingPassword(false);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Błąd podczas zmiany hasła.' });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Profile Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0' }}>Dane użytkownika</h3>
          {!isEditingProfile && (
            <button
              className="btn-secondary"
              onClick={() => setIsEditingProfile(true)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Edytuj
            </button>
          )}
        </div>

        {profileMessage && (
          <div
            className={profileMessage.type === 'error' ? 'error-message' : 'success-message'}
            style={{ marginBottom: '1rem' }}
          >
            {profileMessage.type === 'error' && <AlertCircle size={16} />}
            {profileMessage.type === 'success' && <Check size={16} />}
            <span>{profileMessage.text}</span>
          </div>
        )}

        {isEditingProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Imię</label>
              <input
                className="input-field"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Wpisz swoje imię"
              />
            </div>

            <div className="form-group">
              <label>Nazwisko</label>
              <input
                className="input-field"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Wpisz swoje nazwisko"
              />
            </div>

            <div className="form-group">
              <label>Nick/Nazwa użytkownika</label>
              <input
                className="input-field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Wpisz swój nick"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={handleProfileSave}
                disabled={isLoadingProfile}
                style={{ flex: 1 }}
              >
                {isLoadingProfile ? 'Zapisywanie...' : 'Zapisz'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setIsEditingProfile(false)}
                disabled={isLoadingProfile}
                style={{ flex: 1 }}
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <div>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Imię i nazwisko
              </p>
              <p style={{ margin: '0', fontWeight: '500' }}>
                {firstName && lastName ? `${firstName} ${lastName}` : 'Nie podano'}
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem' }}>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Nick
              </p>
              <p style={{ margin: '0', fontWeight: '500' }}>{username || 'Nie podano'}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem' }}>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Email
              </p>
              <p style={{ margin: '0', fontWeight: '500' }}>{user?.email || 'Nie podano'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Section */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0' }}>Zmiana hasła</h3>
          {!isEditingPassword && (
            <button
              className="btn-secondary"
              onClick={() => setIsEditingPassword(true)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Zmień
            </button>
          )}
        </div>

        {passwordMessage && (
          <div
            className={passwordMessage.type === 'error' ? 'error-message' : 'success-message'}
            style={{ marginBottom: '1rem' }}
          >
            {passwordMessage.type === 'error' && <AlertCircle size={16} />}
            {passwordMessage.type === 'success' && <Check size={16} />}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        {isEditingPassword ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Aktualne hasło</label>
              <input
                className="input-field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Wpisz aktualne hasło"
              />
            </div>

            <div className="form-group">
              <label>Nowe hasło</label>
              <input
                className="input-field"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Wpisz nowe hasło (min. 6 znaków)"
              />
            </div>

            <div className="form-group">
              <label>Potwierdź nowe hasło</label>
              <input
                className="input-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Potwierdź nowe hasło"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={handlePasswordChange}
                disabled={isLoadingPassword}
                style={{ flex: 1 }}
              >
                {isLoadingPassword ? 'Zmiana...' : 'Zmień hasło'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsEditingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isLoadingPassword}
                style={{ flex: 1 }}
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0' }}>
            Kliknij przycisk "Zmień", aby zmienić swoje hasło.
          </p>
        )}
      </div>
    </div>
  );
};
