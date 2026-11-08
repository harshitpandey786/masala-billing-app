import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';
import { DEMO_ROWS } from './demoData.js';

const RESULT_LIMIT = 500;

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Search by name/phone, grouped into one row per customer (not one row per
// bill) -- find a customer, then click through to their full profile. Used
// both on the admin dashboard (with the shared date-range filter and the
// bills/revenue/customers stat tiles) and on the public, no-password
// Customers page counter staff use while billing (without those tiles).
export default function CustomerList({ demoMode, fromDate = '', toDate = '', showStats = true, onSelectCustomer }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(demoMode || supabase ? 'loading' : 'not_configured');

  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    if (demoMode) {
      setStatus('loading');
      const term = debouncedSearch.trim().toLowerCase();
      const filtered = DEMO_ROWS.filter((row) => {
        if (term && !row.customer_name.toLowerCase().includes(term) && !row.phone.includes(term)) {
          return false;
        }
        if (fromDate && row.order_date < fromDate) return false;
        if (toDate && row.order_date > toDate) return false;
        return true;
      }).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT);

      const term = debouncedSearch.trim();
      if (term) {
        const escaped = term.replace(/[%,]/g, '');
        query = query.or(`customer_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
      }
      if (fromDate) query = query.gte('order_date', fromDate);
      if (toDate) query = query.lte('order_date', toDate);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.error('Customer search failed', error);
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
  }, [demoMode, debouncedSearch, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const uniquePhones = new Set(rows.map((r) => r.phone).filter(Boolean));
    return { count: rows.length, totalRevenue, customers: uniquePhones.size };
  }, [rows]);

  const customers = useMemo(() => {
    const byPhone = new Map();
    for (const row of rows) {
      if (!row.phone) continue;
      const entry = byPhone.get(row.phone) || {
        phone: row.phone,
        name: row.customer_name,
        area: row.area,
        totalBills: 0,
        totalSpent: 0,
        lastOrderDate: row.order_date,
      };
      entry.totalBills += 1;
      entry.totalSpent += Number(row.total) || 0;
      entry.name = row.customer_name || entry.name;
      entry.area = entry.area || row.area;
      if (!entry.lastOrderDate || row.order_date > entry.lastOrderDate) {
        entry.lastOrderDate = row.order_date;
      }
      byPhone.set(row.phone, entry);
    }
    return [...byPhone.values()].sort((a, b) => (a.lastOrderDate < b.lastOrderDate ? 1 : -1));
  }, [rows]);

  function clearFilters() {
    setSearch('');
  }

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      {showStats && (
        <div className="stat-tiles admin-search-stats">
          <div className="stat-tile">
            <span className="stat-value">{stats.count}</span>
            <span className="stat-label">{t('totalBills')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
            <span className="stat-label">{t('totalRevenue')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.customers}</span>
            <span className="stat-label">{t('uniqueCustomers')}</span>
          </div>
        </div>
      )}

      <div className="admin-search-row">
        <input
          type="search"
          className="admin-search-input"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn-secondary" onClick={clearFilters}>
            {t('clearFilters')}
          </button>
        )}
      </div>

      {status === 'not_configured' && <p className="hint">{t('notConfigured')}</p>}
      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && customers.length === 0 && <p className="hint">{t('noCustomersFound')}</p>}

      {status === 'ready' && customers.length > 0 && (
        <div className="table-scroll">
          <table className="bill-table ledger-table">
            <thead>
              <tr>
                <th>{t('tableCustomer')}</th>
                <th>{t('tablePhone')}</th>
                <th>{t('tableArea')}</th>
                <th>{t('tableOrders')}</th>
                <th>{t('tableTotalSpent')}</th>
                <th>{t('lastOrderLabel')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.phone}
                  className="ledger-row ledger-row-clickable"
                  onClick={() => onSelectCustomer(c.phone)}
                >
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.area || '—'}</td>
                  <td>{c.totalBills}</td>
                  <td>₹{c.totalSpent.toLocaleString('en-IN')}</td>
                  <td>{c.lastOrderDate ? dateFormatter.format(new Date(c.lastOrderDate)) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(c.phone);
                      }}
                    >
                      {t('viewDetails')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
