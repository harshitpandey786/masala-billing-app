import { useState } from 'react';
import { DEMO_STORAGE_KEY, getInitialDemoMode } from './demoData.js';
import { useLanguage } from '../i18n.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminPricing from './AdminPricing.jsx';

// Owner-only: business analytics (and, eventually, pricing control). Looking
// up a specific customer's order history is a front-of-house task now, done
// on the public /customers page instead -- no password needed for that.
export default function AdminDashboard({ onLogOut }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);

  function toggleDemoMode() {
    setDemoMode((prev) => {
      const next = !prev;
      try {
        if (next) sessionStorage.setItem(DEMO_STORAGE_KEY, '1');
        else sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // sessionStorage unavailable -- toggle just won't persist across reloads.
      }
      return next;
    });
  }

  return (
    <>
      <section className="card admin-dashboard">
        <div className="admin-dashboard-header">
          <div className="admin-period-row">
            <label className="admin-date-field">
              {t('fromDate')}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label className="admin-date-field">
              {t('toDate')}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            {(fromDate || toDate) && (
              <button className="btn-secondary" onClick={() => { setFromDate(''); setToDate(''); }}>
                {t('clearFilters')}
              </button>
            )}
          </div>
          <div className="admin-header-buttons">
            <button className="btn-secondary" onClick={toggleDemoMode}>
              {demoMode ? 'Show live data' : 'Show demo data'}
            </button>
            <button className="btn-secondary" onClick={onLogOut}>
              {t('logOut')}
            </button>
          </div>
        </div>
      </section>

      <AdminAnalytics fromDate={fromDate} toDate={toDate} demoMode={demoMode} />

      <AdminPricing />
    </>
  );
}
