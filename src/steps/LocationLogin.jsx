import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { storeLocation } from '../locationSession.js';
import { useLanguage } from '../i18n.jsx';

// Gates the billing flow behind a per-shop login, modeled on AdminLogin.jsx.
// Same security tradeoff as that password: this checks the locations table
// with the anon key from the browser, which gates the UI, not the database.
// On success, the shop's id/name is stored (see locationSession.js) so every
// bill made on this device is tagged automatically -- no per-bill picker.
export default function LocationLogin({ onLoggedIn }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus('error');
      return;
    }
    setStatus('checking');
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('login_username', username.trim())
        .eq('login_password', password)
        .maybeSingle();
      if (error || !data) {
        setStatus('error');
        return;
      }
      storeLocation(data);
      onLoggedIn(data);
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="card admin-login-card">
      <h2>{t('locationLoginTitle')}</h2>
      <div className="section-divider" />

      {!supabase && <p className="form-error">{t('notConfigured')}</p>}

      <form onSubmit={handleSubmit} className="form-grid admin-login-form">
        <p className="hint">{t('locationLoginHint')}</p>
        <label>
          {t('shopUsername')}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          {t('password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {status === 'error' && <p className="form-error">{t('wrongPassword')}</p>}

        <div className="actions">
          <button type="submit" className="btn-primary" disabled={status === 'checking'}>
            {status === 'checking' ? t('savingBill') : t('unlock')}
          </button>
        </div>
      </form>
    </section>
  );
}
