import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, SearchLg, X } from '@untitledui/icons';
import { Table, TableCard } from '@/components/application/table/table';
import { Avatar } from '@/components/base/avatar/avatar';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';
import { groupBillsByCustomer } from '../customerSearch.js';
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

function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatTile({ label, value }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
      <p className="text-sm font-medium text-tertiary">{label}</p>
      <p className="text-display-xs font-semibold text-primary tabular-nums">{value}</p>
    </div>
  );
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

  const customers = useMemo(() => groupBillsByCustomer(rows), [rows]);

  function clearFilters() {
    setSearch('');
  }

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      {showStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatTile label={t('totalBills')} value={stats.count} />
          <StatTile label={t('totalRevenue')} value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} />
          <StatTile label={t('uniqueCustomers')} value={stats.customers} />
        </div>
      )}

      <TableCard.Root>
        <TableCard.Header
          title={t('customersNavLink')}
          badge={status === 'ready' ? String(customers.length) : undefined}
          contentTrailing={
            <div className="flex w-full gap-3 md:w-auto">
              <Input
                aria-label={t('searchPlaceholder')}
                icon={SearchLg}
                size="sm"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={setSearch}
                className="md:w-80"
              />
              {search && (
                <Button size="sm" color="secondary" iconLeading={X} onClick={clearFilters}>
                  {t('clearFilters')}
                </Button>
              )}
            </div>
          }
        />

        {status === 'not_configured' && <p className="px-4 py-6 text-sm text-tertiary md:px-6">{t('notConfigured')}</p>}
        {status === 'loading' && <p className="px-4 py-6 text-sm text-tertiary md:px-6">{t('loadingResults')}</p>}
        {status === 'error' && <p className="px-4 py-6 text-sm text-error-primary md:px-6">{t('loadError')}</p>}
        {status === 'ready' && customers.length === 0 && (
          <p className="px-4 py-6 text-sm text-tertiary md:px-6">{t('noCustomersFound')}</p>
        )}

        {status === 'ready' && customers.length > 0 && (
          <Table aria-label={t('customersNavLink')} onRowAction={(key) => onSelectCustomer(String(key))}>
            <Table.Header>
              <Table.Head id="name" label={t('tableCustomer')} isRowHeader />
              <Table.Head id="area" label={t('tableArea')} className="max-md:hidden" />
              <Table.Head id="orders" label={t('tableOrders')} />
              <Table.Head id="spent" label={t('tableTotalSpent')} />
              <Table.Head id="last" label={t('lastOrderLabel')} className="max-lg:hidden" />
              <Table.Head id="actions" />
            </Table.Header>
            <Table.Body items={customers.map((c) => ({ ...c, id: c.phone }))}>
              {(c) => (
                <Table.Row id={c.phone} className="cursor-pointer">
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <Avatar size="md" initials={initialsOf(c.name)} />
                      <div className="whitespace-nowrap">
                        <p className="text-sm font-medium text-primary">{c.name}</p>
                        <p className="text-sm text-tertiary">{c.phone}</p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="max-md:hidden">{c.area || '—'}</Table.Cell>
                  <Table.Cell className="tabular-nums">{c.totalBills}</Table.Cell>
                  <Table.Cell className="font-medium whitespace-nowrap text-primary tabular-nums">
                    ₹{c.totalSpent.toLocaleString('en-IN')}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap max-lg:hidden">
                    {c.lastOrderDate ? dateFormatter.format(new Date(c.lastOrderDate)) : '—'}
                  </Table.Cell>
                  <Table.Cell className="px-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        color="link-gray"
                        iconTrailing={ChevronRight}
                        onClick={() => onSelectCustomer(c.phone)}
                      >
                        {t('viewDetails')}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </TableCard.Root>
    </div>
  );
}
