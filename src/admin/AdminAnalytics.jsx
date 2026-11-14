import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from '@untitledui/icons';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent } from '@/components/application/charts/charts-base';
import { Table, TableCard } from '@/components/application/table/table';
import { Avatar } from '@/components/base/avatar/avatar';
import { ProgressBarBase } from '@/components/base/progress-indicators/progress-indicators';
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
  // Any other store name (a shop set up after the original two) is shown
  // as-is rather than collapsing to a generic "Offline" bucket.
  return key || t('offline');
}

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function Panel({ title, children, className = '' }) {
  return (
    <div className={`flex flex-col rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset ${className}`}>
      <div className="px-5 pt-5 pb-2">
        <p className="text-lg font-semibold text-primary">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ShareList({ rows }) {
  return (
    <ul className="flex flex-col px-5 pb-3">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-2 border-t border-secondary py-3 first:border-t-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium text-primary">{row.label}</p>
            <p className="shrink-0 text-sm font-medium text-primary tabular-nums">{row.value}</p>
          </div>
          <ProgressBarBase value={row.sharePct} className="h-1.5" />
          <div className="flex justify-between gap-3 text-xs text-tertiary tabular-nums">
            <span>{row.meta}</span>
            <span>{row.sharePct.toFixed(0)}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAnalytics({ fromDate, toDate, demoMode, locations = [] }) {
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
        .select('order_date,customer_name,phone,billing_mode,store,location_id,masala_type,quantity_kg,total')
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

  function shopLabel(locationId) {
    if (locationId === 'unknown') return t('unknownShopLabel');
    return locations.find((loc) => loc.id === locationId)?.name || t('unknownShopLabel');
  }

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const billsWord = t('totalBills').toLowerCase();

  if (status === 'not_configured' || status === 'error') return null;

  if (status === 'loading') {
    return <p className="px-4 text-sm text-tertiary lg:px-8">{t('loadingResults')}</p>;
  }

  if (analytics.totalBills === 0) {
    return <p className="px-4 text-sm text-tertiary lg:px-8">{t('noAnalyticsData')}</p>;
  }

  const growth = analytics.growthPct;
  const metrics = [
    { label: t('totalRevenue'), value: inr(analytics.totalRevenue) },
    { label: t('avgOrderValue'), value: inr(analytics.avgOrderValue) },
    { label: t('uniqueCustomers'), value: analytics.uniqueCustomers.toLocaleString('en-IN') },
    { label: t('repeatCustomerRate'), value: `${analytics.repeatRatePct.toFixed(0)}%` },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.slice(0, 2).map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
        <div className="flex flex-col gap-2 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
          <p className="text-sm font-medium text-tertiary">{t('monthlyGrowth')}</p>
          {growth == null ? (
            <p className="text-display-sm font-semibold text-primary">—</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-display-sm font-semibold text-primary tabular-nums">
                {`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
              </p>
              <span className="flex items-center gap-1.5 text-sm text-tertiary">
                {growth >= 0 ? (
                  <ArrowUp className="size-4 text-fg-success-primary" />
                ) : (
                  <ArrowDown className="size-4 text-fg-error-primary" />
                )}
                {t('vsLastMonth')}
              </span>
            </div>
          )}
        </div>
        {metrics.slice(2).map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {analytics.monthlyTrend.length > 1 && (
        <div className="flex flex-col gap-5 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
          <p className="text-lg font-semibold text-primary">{t('monthlyTrendTitle')}</p>
          <div className="h-72">
            <ResponsiveContainer initialDimension={{ width: 1, height: 1 }} className="h-full">
              <AreaChart
                data={analytics.monthlyTrend}
                className="text-tertiary [&_.recharts-text]:text-xs"
                margin={{ top: 8, left: -4, right: 8 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" className="text-utility-brand-600" stopOpacity="0.25" />
                    <stop offset="95%" stopColor="currentColor" className="text-utility-brand-600" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-neutral-100" />
                <XAxis dataKey="label" fill="currentColor" axisLine={false} tickLine={false} padding={{ left: 10, right: 10 }} />
                <YAxis
                  fill="currentColor"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  content={<ChartTooltipContent />}
                  formatter={(v) => inr(Number(v))}
                  cursor={{ className: 'stroke-utility-brand-600 stroke-2' }}
                />
                <Area
                  isAnimationActive={false}
                  dataKey="revenue"
                  name={t('totalRevenue')}
                  type="monotone"
                  className="text-utility-brand-600"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                  activeDot={{ className: 'fill-bg-primary stroke-utility-brand-600 stroke-2' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title={t('topItemsTitle')}>
          <ShareList
            rows={analytics.topItems.map((item) => ({
              key: item.type,
              label: masalaTypeLabel(t, item.type),
              value: inr(item.revenue),
              sharePct: item.sharePct,
              meta: `${item.qtyKg.toLocaleString('en-IN')} kg · ${item.bills} ${billsWord}`,
            }))}
          />
        </Panel>
        <Panel title={t('channelBreakdownTitle')}>
          <ShareList
            rows={analytics.channelBreakdown.map((c) => ({
              key: c.key,
              label: channelLabel(t, c.key),
              value: inr(c.revenue),
              sharePct: c.sharePct,
              meta: `${c.bills} ${billsWord}`,
            }))}
          />
        </Panel>
        <Panel title={t('shopPerformanceTitle')}>
          <ShareList
            rows={analytics.shopBreakdown.map((s) => ({
              key: s.locationId,
              label: shopLabel(s.locationId),
              value: inr(s.revenue),
              sharePct: s.sharePct,
              meta: `${s.bills} ${billsWord}`,
            }))}
          />
        </Panel>
      </div>

      <TableCard.Root>
        <TableCard.Header title={t('topCustomersTitle')} />
        <Table aria-label={t('topCustomersTitle')}>
          <Table.Header>
            <Table.Head id="customer" label={t('tableCustomer')} isRowHeader />
            <Table.Head id="revenue" label={t('totalRevenue')} />
            <Table.Head id="bills" label={t('totalBills')} />
            <Table.Head id="last" label={t('lastOrderLabel')} />
          </Table.Header>
          <Table.Body items={analytics.topCustomers.map((c) => ({ ...c, id: c.phone }))}>
            {(c) => (
              <Table.Row id={c.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar size="md" initials={initials(c.name)} />
                    <div className="whitespace-nowrap">
                      <p className="text-sm font-medium text-primary">{c.name}</p>
                      <p className="text-sm text-tertiary">{c.phone}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="font-medium whitespace-nowrap text-primary tabular-nums">{inr(c.revenue)}</Table.Cell>
                <Table.Cell className="tabular-nums">{c.bills}</Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {c.lastOrderDate ? dateFormatter.format(new Date(c.lastOrderDate)) : '—'}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </TableCard.Root>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
      <p className="text-sm font-medium text-tertiary">{label}</p>
      <p className="text-display-sm font-semibold text-primary tabular-nums">{value}</p>
    </div>
  );
}
