import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// A second, shop-specific password -- separate from the billing login this
// shop already used to get into the app (locationSession.js). Checked fresh
// against `locations.admin_password` for the already-known logged-in shop's
// id, so there is no username/shop picker here: this can only ever unlock
// *this* shop's own pricing, never another shop's, even if someone guesses
// another shop's admin password.
export default function ShopAdminLogin({ location, onUnlock }) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error | not_set

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
        .select('admin_password')
        .eq('id', location.id)
        .maybeSingle();
      if (error || !data) {
        setStatus('error');
        return;
      }
      if (!data.admin_password) {
        setStatus('not_set');
        return;
      }
      if (data.admin_password !== value) {
        setStatus('error');
        return;
      }
      onUnlock();
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="card admin-login-card">
      <h2>{t('shopAdminTitle')}</h2>
      <p className="hint">{location.name}</p>
      <div className="section-divider" />

      <form onSubmit={handleSubmit} className="form-grid admin-login-form">
        <p className="hint">{t('shopAdminLoginHint')}</p>
        <label>
          {t('password')}
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </label>

        {status === 'error' && <p className="form-error">{t('wrongPassword')}</p>}
        {status === 'not_set' && <p className="form-error">{t('shopAdminPasswordNotSet')}</p>}

        <div className="actions">
          <button type="submit" className="btn-primary" disabled={status === 'checking'}>
            {status === 'checking' ? t('savingBill') : t('unlock')}
          </button>
        </div>
      </form>
    </section>
  );
}
