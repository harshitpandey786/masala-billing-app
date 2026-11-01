import { useState } from 'react';
import { useLanguage } from '../i18n.jsx';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function AdminLogin({ onUnlock }) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (ADMIN_PASSWORD && value === ADMIN_PASSWORD) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <section className="card admin-login-card">
      <h2>{t('adminTitle')}</h2>
      <div className="section-divider" />

      {!ADMIN_PASSWORD && (
        <p className="form-error">
          VITE_ADMIN_PASSWORD is not set — see docs/supabase-setup.md to configure the owner
          password before this page will unlock.
        </p>
      )}

      <form onSubmit={handleSubmit} className="form-grid admin-login-form">
        <p className="hint">{t('enterPassword')}</p>
        <label>
          {t('password')}
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </label>

        {error && <p className="form-error">{t('wrongPassword')}</p>}

        <div className="actions">
          <button type="submit" className="btn-primary">
            {t('unlock')}
          </button>
        </div>
      </form>
    </section>
  );
}
