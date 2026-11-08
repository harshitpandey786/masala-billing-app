import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage, masalaTypeLabel, channelLabel } from '../i18n.jsx';
import { DEMO_ROWS } from './demoData.js';
import { computeAnalytics } from './analytics.js';
import BillLedgerTable from './BillLedgerTable.jsx';

// A single customer's full order history -- deliberately ignores the
// Customer Lookup date filter, since "this customer's whole history" is the
// point of drilling into their profile.
export default function CustomerDetail({ phone, demoMode, onBack }) {
  const { t, lang } = useLanguage();
  const [bills, setBills] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (demoMode) {
      const filtered = DEMO_ROWS.filter((row) => row.phone === phone).sort((a, b) =>
        a.order_date < b.order_date ? 1 : -1
      );
      setBills(filtered);
      setStatus('ready');
      return;
    }

    if (!supabase) {
      setStatus('not_configured');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    async function run() {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('phone', phone)
        .order('order_date', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('Customer history failed', error);
        setStatus('error');
        return;
      }
      setBills(data || []);
      setStatus('ready');
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [demoMode, phone]);

  const profile = useMemo(() => {
    if (bills.length === 0) return null;
    const analytics = computeAnalytics(bills);
    const orderDates = bills.map((b) => b.order_date).filter(Boolean).sort();
    const firstOrderDate = orderDates[0];
    const lastOrderDate = orderDates[orderDates.length - 1];

    // Average days between orders -- "how often do they come back", not
    // revenue-weighted, so one order has no frequency to report.
    let orderFrequencyDays = null;
    if (orderDates.length > 1) {
      const spanDays = (new Date(lastOrderDate) - new Date(firstOrderDate)) / (1000 * 60 * 60 * 24);
      orderFrequencyDays = spanDays / (orderDates.length - 1);
    }

    // How they usually order -- by order count, not revenue, since this is
    // about habit ("mostly online") rather than where the money came from.
    const channelCounts = new Map();
    for (const b of bills) {
      const key = b.billing_mode === 'offline' ? b.store || 'offline-other' : 'online';
      channelCounts.set(key, (channelCounts.get(key) || 0) + 1);
    }
    const [preferredChannelKey, preferredChannelCount] =
      [...channelCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const preferredChannel = preferredChannelKey
      ? { key: preferredChannelKey, sharePct: (preferredChannelCount / bills.length) * 100 }
      : null;

    return {
      name: bills[0].customer_name,
      phone: bills[0].phone,
      area: bills[0].area,
      totalSpent: analytics.totalRevenue,
      totalBills: analytics.totalBills,
      avgOrderValue: analytics.avgOrderValue,
      favoriteItem: analytics.topItems[0] || null,
      firstOrderDate,
      lastOrderDate,
      orderFrequencyDays,
      preferredChannel,
    };
  }, [bills]);

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <section className="card admin-dashboard customer-detail">
      <button type="button" className="btn-secondary btn-small customer-detail-back" onClick={onBack}>
        ← {t('backToCustomers')}
      </button>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}
      {status === 'not_configured' && <p className="hint">{t('notConfigured')}</p>}

      {status === 'ready' && profile && (
        <>
          <div className="customer-detail-header">
            <h2>{profile.name}</h2>
            <p className="hint">
              {profile.phone}
              {profile.area ? ` · ${profile.area}` : ''}
            </p>
          </div>

          <div className="stat-tiles admin-search-stats">
            <div className="stat-tile">
              <span className="stat-value">{inr(profile.totalSpent)}</span>
              <span className="stat-label">{t('totalSpent')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{profile.totalBills}</span>
              <span className="stat-label">{t('totalBills')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{inr(profile.avgOrderValue)}</span>
              <span className="stat-label">{t('avgOrderValue')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">
                {profile.favoriteItem ? masalaTypeLabel(t, profile.favoriteItem.type) : '—'}
              </span>
              <span className="stat-label">{t('favoriteItem')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">
                {profile.firstOrderDate ? dateFormatter.format(new Date(profile.firstOrderDate)) : '—'}
              </span>
              <span className="stat-label">{t('firstOrderLabel')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">
                {profile.lastOrderDate ? dateFormatter.format(new Date(profile.lastOrderDate)) : '—'}
              </span>
              <span className="stat-label">{t('lastOrderLabel')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">
                {profile.orderFrequencyDays != null
                  ? `~${Math.round(profile.orderFrequencyDays)} ${t('daysUnit')}`
                  : '—'}
              </span>
              <span className="stat-label">{t('orderFrequencyLabel')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">
                {profile.preferredChannel ? channelLabel(t, profile.preferredChannel.key) : '—'}
              </span>
              <span className="stat-label">{t('preferredChannelLabel')}</span>
            </div>
          </div>

          <BillLedgerTable rows={bills} />
        </>
      )}
    </section>
  );
}
