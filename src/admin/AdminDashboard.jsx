import { useState } from 'react';
import { DEMO_STORAGE_KEY, getInitialDemoMode } from './demoData.js';
import { useLanguage } from '../i18n.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import CustomerList from './CustomerList.jsx';
import CustomerDetail from './CustomerDetail.jsx';

export default function AdminDashboard({ onLogOut }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);
  const [selectedPhone, setSelectedPhone] = useState(null);

  function toggleDemoMode() {
    setSelectedPhone(null);
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

      {selectedPhone ? (
        <CustomerDetail phone={selectedPhone} demoMode={demoMode} onBack={() => setSelectedPhone(null)} />
      ) : (
        <section className="card admin-dashboard">
          <h2>{t('customerLookupTitle')}</h2>
          <CustomerList
            demoMode={demoMode}
            fromDate={fromDate}
            toDate={toDate}
            onSelectCustomer={setSelectedPhone}
          />
        </section>
      )}
    </>
  );
}
