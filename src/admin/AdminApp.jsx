import { useState } from 'react';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../i18n.jsx';

const SESSION_KEY = 'shindraj_admin_ok';

export default function AdminApp() {
  const { t } = useLanguage();
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  function handleUnlock() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable -- auth just won't persist across reloads.
    }
    setAuthed(true);
  }

  function handleLogOut() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/logo-mark.png" alt="Shindraj Masale logo" className="app-logo" />
          <div className="app-header-text">
            <h1>{t('adminTitle')}</h1>
            <p className="tagline">{t('adminSubtitle')}</p>
          </div>
          <div className="app-header-tools">
            <LanguageToggle />
            <a className="admin-link" href="/">
              {t('backToBilling')}
            </a>
          </div>
        </div>
      </header>

      <div className="app-layout app-layout-single">
        <main className="app-main">
          {authed ? (
            <AdminDashboard onLogOut={handleLogOut} />
          ) : (
            <AdminLogin onUnlock={handleUnlock} />
          )}
        </main>
      </div>
    </div>
  );
}
