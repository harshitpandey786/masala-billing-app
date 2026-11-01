import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage, masalaTypeLabel, storeLabel } from '../i18n.jsx';

const RESULT_LIMIT = 500;

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function AdminDashboard({ onLogOut }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [expandedId, setExpandedId] = useState(null);

  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
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
        console.error('Admin search failed', error);
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
  }, [debouncedSearch, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const uniquePhones = new Set(rows.map((r) => r.phone).filter(Boolean));
    return { count: rows.length, totalRevenue, customers: uniquePhones.size };
  }, [rows]);

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
  }

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <section className="card admin-dashboard">
      <div className="admin-dashboard-header">
        <div className="stat-tiles">
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
        <button className="btn-secondary" onClick={onLogOut}>
          {t('logOut')}
        </button>
      </div>

      <div className="admin-search-row">
        <input
          type="search"
          className="admin-search-input"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="admin-date-field">
          {t('fromDate')}
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="admin-date-field">
          {t('toDate')}
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        {(search || fromDate || toDate) && (
          <button className="btn-secondary" onClick={clearFilters}>
            {t('clearFilters')}
          </button>
        )}
      </div>

      {status === 'not_configured' && <p className="hint">{t('notConfigured')}</p>}
      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && rows.length === 0 && <p className="hint">{t('noResults')}</p>}

      {status === 'ready' && rows.length > 0 && (
        <div className="table-scroll">
          <table className="bill-table ledger-table">
            <thead>
              <tr>
                <th>{t('tableDate')}</th>
                <th>{t('tableCustomer')}</th>
                <th>{t('tablePhone')}</th>
                <th>{t('tableType')}</th>
                <th>{t('tableQty')}</th>
                <th>{t('tableTotal')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isOpen = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="ledger-row">
                      <td>{dateFormatter.format(new Date(row.order_date))}</td>
                      <td>{row.customer_name}</td>
                      <td>{row.phone}</td>
                      <td>
                        {masalaTypeLabel(t, (row.masala_type || '').toLowerCase())}
                        {row.billing_mode === 'offline' && row.store
                          ? ` · ${storeLabel(t, row.store)}`
                          : ''}
                      </td>
                      <td>{row.quantity_kg} kg</td>
                      <td>₹{Number(row.total).toLocaleString('en-IN')}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={() => setExpandedId(isOpen ? null : row.id)}
                        >
                          {isOpen ? t('hideDetails') : t('viewDetails')}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="ledger-detail-row">
                        <td colSpan={7}>
                          <table className="bill-table ledger-detail-table">
                            <thead>
                              <tr>
                                <th>{t('particulars')}</th>
                                <th>{t('quantity')}</th>
                                <th>{t('amount')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(row.line_items || []).map((line, i) => (
                                <tr key={`${row.id}-${line.code}-${i}`}>
                                  <td>{line.code}</td>
                                  <td>
                                    {line.qty} {line.unit === 'piece' ? 'pcs' : 'g'}
                                  </td>
                                  <td>₹{line.amount}</td>
                                </tr>
                              ))}
                              <tr className="subtotal-row">
                                <td colSpan={2}>{t('ingredientsSubtotal')}</td>
                                <td>₹{row.ingredients_subtotal}</td>
                              </tr>
                              <tr className="making-charge-row">
                                <td colSpan={2}>{t('makingCharge')}</td>
                                <td>₹{row.making_charge}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
