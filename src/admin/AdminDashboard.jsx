import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { DEMO_STORAGE_KEY, getInitialDemoMode } from './demoData.js';
import { useLanguage } from '../i18n.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminPricing from './AdminPricing.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminLocations from './AdminLocations.jsx';

// Owner-only: business analytics, and per-shop pricing/product control.
// Looking up a specific customer's order history is a front-of-house task
// now, done on the public /customers page instead -- no password needed for
// that.
//
// Pricing and product prices are fully independent per shop (see
// docs/supabase-setup.md §9), so there's no "edit all shops at once" view --
// the owner picks one shop from `shopSelector` below and edits that shop's
// numbers, the same component a shop's own /shop-admin uses for itself.
export default function AdminDashboard({ onLogOut }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('locations')
      .select('id, name')
      .order('created_at')
      .then(({ data, error }) => {
        if (error || !data) return;
        setLocations(data);
        setSelectedLocationId((prev) => prev || data[0]?.id || '');
      });
  }, []);

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

      <AdminAnalytics fromDate={fromDate} toDate={toDate} demoMode={demoMode} locations={locations} />

      {locations.length > 0 && (
        <section className="card admin-dashboard">
          <label className="admin-date-field">
            {t('editingShopLabel')}
            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {selectedLocationId && <AdminPricing key={selectedLocationId} locationId={selectedLocationId} />}

      <AdminProducts />

      <AdminLocations />
    </>
  );
}
