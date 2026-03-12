import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.includes('@')) {
      return 'Podaj poprawny adres email.';
    }
    if (password.length < 6) {
      return 'Hasło musi zawierać co najmniej 6 znaków.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Rejestracja zakończona sukcesem! Sprawdź swoją skrzynkę e-mail, aby aktywować konto (w zależności od ustawień Supabase). Możesz się teraz zalogować.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieznany błąd podczas autoryzacji.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', width: '100%', maxWidth: '440px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.25rem' }}>
            <Home size={32} color="var(--primary-color)" />
          </div>
          <h2>{isLogin ? 'Zaloguj się' : 'Utwórz konto'}</h2>
          <p>{isLogin ? 'Witaj z powrotem w Roomies' : 'Dołącz do wspólnego mieszkania'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="success-message">
              {successMsg}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Adres E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="email"
                type="email"
                className="input-field"
                style={{ paddingLeft: '3rem' }}
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="password">Hasło</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="password"
                type="password"
                className="input-field"
                style={{ paddingLeft: '3rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Zarejestruj się')}
          </button>
        </form>

        <div className="toggle-auth">
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}
          </span>
          <button 
            type="button" 
            className="toggle-link"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
            }}
          >
            {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
          </button>
        </div>
        
      </div>
    </div>
  );
};
