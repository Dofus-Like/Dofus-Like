import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../store/language.store';
import './LoginPage.css';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setToken, setPlayer } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      let response;
      if (isRegister) {
        response = await authApi.register({ username, email, password });
      } else {
        response = await authApi.login({ email, password });
      }

      setToken(response.data.accessToken);

      const me = await authApi.getMe();
      setPlayer(me.data);

      navigate('/');
    } catch {
      setError(t('authError'));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">⚔️ Moyenax</h1>
        <p className="login-subtitle">{t('loginSubtitle')}</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            {t('login')}
          </button>
          <button
            className={`login-tab ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            {t('register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <input
              type="text"
              placeholder={t('username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              required
              minLength={3}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
            minLength={8}
          />

          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button">
            {isRegister ? t('createAccount') : t('signIn')}
          </button>
        </form>

        {!isRegister && (
            <div className="quick-login">
                <p className="quick-login-title">⚡ {t('quickLogin')}</p>
                <div className="quick-login-buttons">
                    {[
                        { name: 'Warrior', emoji: '🛡️', email: 'warrior@test.com', class: 'warrior' },
                        { name: 'Mage', emoji: '🧙', email: 'mage@test.com', class: 'mage' },
                        { name: 'Ninja', emoji: '🥷', email: 'ninja@test.com', class: 'ninja' },
                        { name: 'Troll', emoji: '👺', email: 'troll@test.com', class: 'troll' },
                    ].map(user => (
                        <button 
                            key={user.email}
                            type="button"
                            className={`quick-btn ${user.class}`}
                            onClick={async () => {
                                try {
                                    const res = await authApi.login({ email: user.email, password: 'password123' });
                                    setToken(res.data.accessToken);
                                    const me = await authApi.getMe();
                                    setPlayer(me.data);
                                    navigate('/');
                                } catch (e) { 
                                    console.error('Quick login error:', e);
                                    setError(t('seedMissing')); 
                                }
                            }}
                        >
                            {user.emoji} {user.name}
                        </button>
                    ))}
                </div>
                <p className="quick-login-tip">💡 {t('quickLoginTip')}</p>
            </div>
        )}
      </div>
    </div>
  );
}
