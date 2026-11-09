import { useState } from 'react';
import CustomerList from './admin/CustomerList.jsx';
import CustomerDetail from './admin/CustomerDetail.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import { useLanguage } from './i18n.jsx';

// Front-of-house customer lookup -- no password. Any operator can find a
// returning customer and see their order history while billing; the
// business-wide numbers (revenue, growth, top customers) stay admin-only on
// /admin, which is the only real difference between this and the old
// admin-embedded version.
export default function CustomerLookupApp() {
  const { t } = useLanguage();
  const [selectedPhone, setSelectedPhone] = useState(null);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/logo-mark.png" alt="Shindraj Masale logo" className="app-logo" />
          <div className="app-header-text">
            <h1>{t('customerLookupTitle')}</h1>
            <p className="tagline">{t('adminSubtitle')}</p>
          </div>
          <div className="app-header-tools">
            <LanguageToggle />
            <a className="admin-link" href="/">
              {t('backToBilling')}
            </a>
            <a className="admin-link" href="/admin">
              {t('adminLink')}
            </a>
          </div>
        </div>
      </header>

      <div className="app-layout app-layout-single">
        <main className="app-main">
          {selectedPhone ? (
            <CustomerDetail phone={selectedPhone} demoMode={false} onBack={() => setSelectedPhone(null)} />
          ) : (
            <section className="card admin-dashboard">
              <CustomerList demoMode={false} showStats={false} onSelectCustomer={setSelectedPhone} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
