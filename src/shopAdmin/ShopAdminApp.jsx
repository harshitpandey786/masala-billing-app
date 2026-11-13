import { useState } from 'react';
import ShopAdminLogin from './ShopAdminLogin.jsx';
import AdminPricing from '../admin/AdminPricing.jsx';
import ShopProductPricing from './ShopProductPricing.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { getStoredLocation } from '../locationSession.js';
import { useLanguage } from '../i18n.jsx';

function sessionKeyFor(locationId) {
  return `shindraj_shop_admin_ok_${locationId}`;
}

// Each shop's own pricing/product-price editor -- gated by a password
// separate from that shop's billing login, and always scoped to whichever
// shop is already logged in on this device (locationSession.js). There is
// no shop picker here and no link anywhere to the owner's /admin: this page
// can only ever reach the one shop already signed in on this device.
export default function ShopAdminApp() {
  const { t } = useLanguage();
  const location = getStoredLocation();
  const [authed, setAuthed] = useState(() => {
    if (!location) return false;
    try {
      return sessionStorage.getItem(sessionKeyFor(location.id)) === '1';
    } catch {
      return false;
    }
  });

  function handleUnlock() {
    try {
      sessionStorage.setItem(sessionKeyFor(location.id), '1');
    } catch {
      // sessionStorage unavailable -- auth just won't persist across reloads.
    }
    setAuthed(true);
  }

  function handleLogOut() {
    try {
      sessionStorage.removeItem(sessionKeyFor(location.id));
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
            <h1>{t('shopAdminTitle')}</h1>
            {location && <p className="tagline">{location.name}</p>}
          </div>
          <div className="app-header-tools">
            <LanguageToggle />
            <a className="admin-link" href="/">
              {t('backToBilling')}
            </a>
            {authed && (
              <button type="button" className="admin-link admin-link-button" onClick={handleLogOut}>
                {t('logOut')}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-layout app-layout-single">
        <main className="app-main">
          {!location && <p className="hint">{t('shopAdminNeedsLoginHint')}</p>}
          {location && !authed && <ShopAdminLogin location={location} onUnlock={handleUnlock} />}
          {location && authed && (
            <>
              <AdminPricing key={location.id} locationId={location.id} />
              <ShopProductPricing key={location.id} locationId={location.id} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
