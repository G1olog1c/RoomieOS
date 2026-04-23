import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { ArrowLeft, User, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
    const { user, updateProfile } = useAuthStore();
    const { currentFlat, members, leaveFlat } = useFlatStore();
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.display_name || '');
        }
    }, [user]);

    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMsg(null);
        setErrorMsg(null);
        setIsUpdating(true);

        const success = await updateProfile(displayName);
        if (success) {
            setSuccessMsg('Profil zaktualizowany pomyślnie!');
        } else {
            setErrorMsg('Nie udało się zaktualizować profilu.');
        }
        setIsUpdating(false);
    };

    const handleLeaveFlat = async () => {
        if (!window.confirm('Czy na pewno chcesz opuścić to mieszkanie? Wyjście pozbawi Cię dostępu do wydatków i notatek.')) {
            return;
        }
        const success = await leaveFlat();
        if (success) {
            navigate('/');
        } else {
            setErrorMsg('Wystąpił błąd przy próbie opuszczenia mieszkania.');
        }
    };

    const myRole = members.find(m => m.user_id === user?.id)?.role;

    return (
        <div className="main-content animate-fade-in page-shell profile-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/">
                    <button className="btn-secondary" style={{ padding: '0.6rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                </Link>
                <h2>Ustawienia konta</h2>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div className="profile-card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <User size={32} color="var(--primary-color)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>Twój Profil</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>{user?.email}</p>
                        </div>
                    </div>

                    {successMsg && (
                        <div className="success-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                            <CheckCircle size={16} /> <span>{successMsg}</span>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="error-message">
                            <AlertCircle size={16} /> <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label>Nazwa użytkownika (wyświetlana reszcie lokatorów)</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={displayName} 
                                onChange={e => setDisplayName(e.target.value)} 
                                placeholder="Wpisz imię lub pseudonim..." 
                                disabled={isUpdating}
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isUpdating} style={{ width: 'auto', marginTop: '0.5rem' }}>
                            {isUpdating ? 'Zapisywanie...' : 'Zapisz zmiany'}
                        </button>
                    </form>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h3 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Mieszkanie i członkostwo</h3>
                    {currentFlat ? (
                        <>
                            <p style={{ marginBottom: '1.5rem' }}>Obecnie należysz do mieszkania: <strong>{currentFlat.name}</strong> jako <strong>{myRole === 'admin' ? 'Administrator' : 'Lokator'}</strong>.</p>
                            <button onClick={handleLeaveFlat} className="btn-secondary" style={{ color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                <LogOut size={16} /> Opuść mieszkanie
                            </button>
                        </>
                    ) : (
                        <p>Nie jesteś aktualnie przypisany do żadnego mieszkania.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
