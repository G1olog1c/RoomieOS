import React, { useState, useEffect } from 'react';
import { X, User, Home, Lock, AlertCircle, CheckCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { supabase } from '../lib/supabase';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentFlat, members, leaveFlat, joinFlat, createFlat } = useFlatStore();
  
  const [activeTab, setActiveTab] = useState<'user' | 'rooms'>('user');
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Room state
  const [inviteCode, setInviteCode] = useState('');
  const [roomMsg, setRoomMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      setNickname(user.user_metadata?.nickname || user.user_metadata?.display_name || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          nickname: nickname,
          display_name: nickname || firstName // For backwards compatibility
        }
      });
      if (error) throw error;
      setProfileMsg({ type: 'success', text: 'Profil zaktualizowany pomyślnie!' });
      setIsEditingProfile(false);
      // user object will be automatically updated by authStore listener
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: 'Nie udało się zaktualizować profilu: ' + err.message });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Nowe hasła nie są identyczne!' });
      return;
    }
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Musisz podać aktualne hasło!' });
      return;
    }
    try {
      // 1. Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      
      if (signInError) throw new Error('Aktualne hasło jest nieprawidłowe.');

      // 2. Change password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setPasswordMsg({ type: 'success', text: 'Hasło zostało zmienione.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    }
  };

  const handleJoinRoom = async () => {
    setRoomMsg(null);
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
        setRoomMsg({ type: 'error', text: 'Kod zaproszenia musi mieć 6 znaków.' });
        return;
    }
    const success = await joinFlat(inviteCode.trim());
    if (success) {
      setRoomMsg(null);
      setInviteCode('');
      onClose();
    } else {
      setRoomMsg({ type: 'error', text: 'Nieprawidłowy kod zaproszenia lub błąd serwera.' });
    }
  };

  const handleLeaveRoom = async () => {
    if (window.confirm('Na pewno chcesz opuścić ten pokój? Stracisz dostęp do wszystkich danych.')) {
      setRoomMsg(null);
      const success = await leaveFlat();
      if (!success) {
        setRoomMsg({ type: 'error', text: 'Błąd podczas opuszczania pokoju.' });
      }
    }
  };

  const handleCreateNewRoom = async () => {
      // Typically creating a room might be a different flow, 
      // but if the user wants it here, we'll prompt for name.
      const name = prompt("Podaj nazwę nowego pokoju/mieszkania:");
      if (name && name.trim()) {
          const success = await createFlat(name.trim());
          if (success) {
              onClose();
          } else {
              setRoomMsg({ type: 'error', text: 'Nie udało się utworzyć pokoju.' });
          }
      }
  };

  return (
    <div className="settings-backdrop animate-fade-in" onClick={handleBackdropClick}>
      <div className="settings-modal scale-in">
        <div className="settings-header">
          <h2>Ustawienia</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <User size={18} /> Użytkownik
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            <Home size={18} /> Pokoje
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'user' && (
            <div className="tab-pane animate-fade-in">
              <section className="settings-section">
                <h3>Twoje Dane</h3>
                {profileMsg && (
                  <div className={`message ${profileMsg.type}`}>
                    {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {profileMsg.text}
                  </div>
                )}
                <div className="form-group row-group">
                  <div className="input-group">
                    <label>Imię</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={firstName} 
                      onChange={e => setFirstName(e.target.value)} 
                      disabled={!isEditingProfile}
                    />
                  </div>
                  <div className="input-group">
                    <label>Nazwisko</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={lastName} 
                      onChange={e => setLastName(e.target.value)} 
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Nick (wyświetlany publicznie)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={nickname} 
                    onChange={e => setNickname(e.target.value)} 
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="form-group">
                  <label>Email (Tylko do odczytu)</label>
                  <input 
                    type="text" 
                    className="input-field disabled-input" 
                    value={user?.email || ''} 
                    disabled 
                  />
                </div>
                <div className="actions-row">
                  {isEditingProfile ? (
                    <>
                      <button className="btn-secondary" onClick={() => setIsEditingProfile(false)}>Anuluj</button>
                      <button className="btn-primary" onClick={handleSaveProfile}>Zapisz</button>
                    </>
                  ) : (
                    <button className="btn-secondary" onClick={() => setIsEditingProfile(true)}>Edytuj</button>
                  )}
                </div>
              </section>

              <hr className="divider" />

              <section className="settings-section">
                <h3>Zmiana Hasła <Lock size={16} style={{display:'inline', marginLeft: 8}} /></h3>
                {passwordMsg && (
                  <div className={`message ${passwordMsg.type}`}>
                    {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {passwordMsg.text}
                  </div>
                )}
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Aktualne hasło</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nowe hasło</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Powtórz nowe hasło</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{marginTop: '0.5rem'}}>
                    Zmień hasło
                  </button>
                </form>
              </section>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="tab-pane animate-fade-in">
              <section className="settings-section">
                <h3>Twój Aktualny Pokój</h3>
                {roomMsg && (
                  <div className={`message ${roomMsg.type}`}>
                    {roomMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {roomMsg.text}
                  </div>
                )}
                {currentFlat ? (
                  <div className="current-room-card">
                    <div className="room-info">
                      <h4>{currentFlat.name}</h4>
                      <p>Liczba osób: <strong>{members.length}</strong></p>
                      <div className="invite-box">
                        <span>Kod zaproszenia:</span>
                        <code className="invite-code">{currentFlat.invite_code}</code>
                      </div>
                    </div>
                    <button className="btn-danger" onClick={handleLeaveRoom}>
                      <LogOut size={16} /> Opuść pokój
                    </button>
                  </div>
                ) : (
                  <div className="no-room-info">
                    <p>Nie należysz jeszcze do żadnego pokoju.</p>
                  </div>
                )}
              </section>

              <hr className="divider" />

              <section className="settings-section">
                <h3>Dołącz do Pokoju</h3>
                <div className="join-room-form">
                  <div className="form-group">
                    <label>Kod zaproszenia</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="np. ABCDEF" 
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <button className="btn-primary" onClick={handleJoinRoom} style={{ whiteSpace: 'nowrap' }}>
                         Dołącz
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              
              <hr className="divider" />

              <section className="settings-section">
                <h3>Utwórz Nowy Pokój</h3>
                <p style={{marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                    Przydatne jeśli chcesz zacząć nowe wspólne mieszkanie.
                </p>
                <button className="btn-secondary" onClick={handleCreateNewRoom}>
                   Utwórz pokój
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
