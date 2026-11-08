import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage, masalaTypeLabel, storeLabel } from '../i18n.jsx';
import { DEMO_ROWS } from './demoData.js';
import { computeAnalytics } from './analytics.js';

// Analytics are scoped by the same from/to date pickers as the search below,
// but deliberately ignore the name/phone search box -- "best seller" and
// "revenue growth" should describe the whole business for that period, not
// just whichever customer the owner happens to be looking up right now.
const ANALYTICS_LIMIT = 2000;

function channelLabel(t, key) {
  if (key === 'online') return t('online');
  if (key === 'lalbaug' || key === 'sewri') return storeLabel(t, key);
  return t('offline');
}

export default function AdminAnalytics({ fromDate, toDate, demoMode }) {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(demoMode || supabase ? 'loading' : 'not_configured');

  useEffect(() => {
    if (demoMode) {
      setStatus('loading');
      const filtered = DEMO_ROWS.filter((row) => {
        if (fromDate && row.order_date < fromDate) return false;
        if (toDate && row.order_date > toDate) return false;
        return true;
      });
      setRows(filtered);
      setStatus('ready');
      return;
    }

    if (!supabase) return;

    let cancelled = false;
    setStatus('loading');

    async function run() {
      let query = supabase
        .from('bills')
        .select('order_date,customer_name,phone,billing_mode,store,masala_type,quantity_kg,total')
        .order('order_date', { ascending: true })
        .limit(ANALYTICS_LIMIT);

      if (fromDate) query = query.gte('order_date', fromDate);
      if (toDate) query = query.lte('order_date', toDate);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.error('Admin analytics failed', error);
        setStatus('error');
        return;
      }
      setRows(data || []);
      setStatus('ready');
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [demoMode, fromDate, toDate]);

  const analytics = useMemo(() => computeAnalytics(rows), [rows]);

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  if (status === 'not_configured' || status === 'error') return null;

  return (
    <section className="card analytics-card">
      <h2>{t('analyticsTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}

      {status === 'ready' && analytics.totalBills === 0 && <p className="hint">{t('noAnalyticsData')}</p>}

      {status === 'ready' && analytics.totalBills > 0 && (
        <>
          <div className="analytics-kpis">
            <div className="stat-tile">
              <span className="stat-value">{inr(analytics.totalRevenue)}</span>
              <span className="stat-label">{t('totalRevenue')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{inr(analytics.avgOrderValue)}</span>
              <span className="stat-label">{t('avgOrderValue')}</span>
            </div>
            <div className="stat-tile">
              <span
                className={
                  'stat-value' +
                  (analytics.growthPct == null
                    ? ''
                    : analytics.growthPct >= 0
                      ? ' stat-positive'
                      : ' stat-negative')
                }
              >
                {analytics.growthPct == null
                  ? '—'
                  : `${analytics.growthPct >= 0 ? '+' : ''}${analytics.growthPct.toFixed(1)}%`}
              </span>
              <span className="stat-label">{t('monthlyGrowth')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{analytics.uniqueCustomers}</span>
              <span className="stat-label">{t('uniqueCustomers')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{analytics.repeatRatePct.toFixed(0)}%</span>
              <span className="stat-label">{t('repeatCustomerRate')}</span>
            </div>
          </div>

          {analytics.monthlyTrend.length > 1 && (
            <div className="analytics-section">
              <h3>{t('monthlyTrendTitle')}</h3>
              <div className="trend-chart">
                {analytics.monthlyTrend.map((m) => {
                  const max = Math.max(...analytics.monthlyTrend.map((x) => x.revenue), 1);
                  const heightPct = Math.max((m.revenue / max) * 100, 4);
                  return (
                    <div className="trend-bar-col" key={m.month}>
                      <span className="trend-bar-value">{inr(m.revenue)}</span>
                      <div className="trend-bar-track">
                        <div className="trend-bar" style={{ height: `${heightPct}%` }} />
                      </div>
                      <span className="trend-bar-label">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="analytics-grid">
            <div className="analytics-section">
              <h3>{t('topItemsTitle')}</h3>
              <ul className="bar-list">
                {analytics.topItems.map((item) => (
                  <li className="bar-list-row" key={item.type}>
                    <div className="bar-list-head">
                      <span>{masalaTypeLabel(t, item.type)}</span>
                      <span>{inr(item.revenue)}</span>
                    </div>
                    <div className="bar-list-track">
                      <div className="bar-list-fill bar-list-fill-chili" style={{ width: `${item.sharePct}%` }} />
                    </div>
                    <div className="bar-list-meta">
                      <span>
                        {item.qtyKg.toLocaleString('en-IN')} kg · {item.bills} {t('totalBills').toLowerCase()}
                      </span>
                      <span>{item.sharePct.toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="analytics-section">
              <h3>{t('channelBreakdownTitle')}</h3>
              <ul className="bar-list">
                {analytics.channelBreakdown.map((c) => (
                  <li className="bar-list-row" key={c.key}>
                    <div className="bar-list-head">
                      <span>{channelLabel(t, c.key)}</span>
                      <span>{inr(c.revenue)}</span>
                    </div>
                    <div className="bar-list-track">
                      <div
                        className="bar-list-fill bar-list-fill-turmeric"
                        style={{ width: `${c.sharePct}%` }}
                      />
                    </div>
                    <div className="bar-list-meta">
                      <span>
                        {c.bills} {t('totalBills').toLowerCase()}
                      </span>
                      <span>{c.sharePct.toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="analytics-section">
            <h3>{t('topCustomersTitle')}</h3>
            <div className="table-scroll">
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>{t('tableCustomer')}</th>
                    <th>{t('tablePhone')}</th>
                    <th>{t('totalRevenue')}</th>
                    <th>{t('totalBills')}</th>
                    <th>{t('lastOrderLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topCustomers.map((c) => (
                    <tr key={c.phone}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{inr(c.revenue)}</td>
                      <td>{c.bills}</td>
                      <td>{c.lastOrderDate ? dateFormatter.format(new Date(c.lastOrderDate)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
