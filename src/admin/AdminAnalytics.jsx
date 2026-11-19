import { useEffect, useMemo, useState } from 'react';
import { Award01, BarChartSquare02, Receipt, Repeat04, TrendDown02, TrendUp02, Users01 } from '@untitledui/icons';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent } from '@/components/application/charts/charts-base';
import { Table, TableCard } from '@/components/application/table/table';
import { Avatar } from '@/components/base/avatar/avatar';
import { cx } from '@/utils/cx';
import { supabase } from '../supabaseClient.js';
import { useLanguage, masalaTypeLabel, storeLabel } from '../i18n.jsx';
import { DEMO_ROWS } from './demoData.js';
import { computeAnalytics } from './analytics.js';
import { avatarColorFor } from '../utils/avatarColor.js';
import { masalaTypeColorFor } from '../utils/masalaTypeColor.js';

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
    <div className={cx('flex flex-col rounded-2xl bg-primary shadow-xs ring-1 ring-secondary ring-inset', className)}>
      <div className="px-5 pt-5 pb-1 lg:px-6">
        <p className="text-xl font-bold text-primary">{title}</p>
      </div>
      {children}
    </div>
  );
}

// `tile` is an optional colored square (masala types); `barClass` colors the
// share bar so each masala keeps the same color it has at the counter.
function ShareList({ rows }) {
  return (
    <ul className="flex flex-col px-5 pb-4 lg:px-6">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3.5 border-t border-secondary py-4 first:border-t-0">
          {row.tile && (
            <span
              className={cx(
                'flex size-11 shrink-0 items-center justify-center rounded-xl text-md font-bold',
                row.tile.bg,
                row.tile.text
              )}
            >
              {row.label.charAt(0)}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-md font-semibold text-primary">{row.label}</p>
              <p className="shrink-0 text-md font-bold text-primary tabular-nums">{row.value}</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className={cx('h-full rounded-full', row.barClass || 'bg-brand-solid')} style={{ width: `${row.sharePct}%` }} />
            </div>
            <div className="flex justify-between gap-3 text-sm text-tertiary tabular-nums">
              <span>{row.meta}</span>
              <span className="font-semibold text-secondary">{row.sharePct.toFixed(0)}%</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-primary text-fg-brand-primary">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-display-xs font-bold text-primary tabular-nums">{value}</p>
        <p className="text-sm font-medium text-tertiary">
          {label}
          {sub && <span className="text-quaternary"> · {sub}</span>}
        </p>
      </div>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="px-4 lg:px-8">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary px-6 py-16 text-center shadow-xs ring-1 ring-secondary ring-inset">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-fg-quaternary">
          <BarChartSquare02 className="size-6" />
        </span>
        <p className="text-md font-medium text-secondary">{children}</p>
      </div>
    </div>
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
    return <Notice>{t('loadingResults')}</Notice>;
  }

  if (analytics.totalBills === 0) {
    return <Notice>{t('noAnalyticsData')}</Notice>;
  }

  const growth = analytics.growthPct;
  const bestSeller = analytics.topItems[0];

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <div className="relative flex min-h-56 flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-brand-solid p-6 text-white shadow-md col-span-2 xl:row-span-2 lg:p-7">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cover bg-center opacity-20 [mask-image:linear-gradient(to_left,black,transparent)]"
            style={{ backgroundImage: "url('/products/5745.jpg')" }}
          />
          <div className="relative flex flex-col gap-1">
            <p className="text-md font-medium text-white/80">{t('totalRevenue')}</p>
            <p className="text-display-lg font-bold tabular-nums">{inr(analytics.totalRevenue)}</p>
            <p className="text-md text-white/80 tabular-nums">
              {analytics.totalBills.toLocaleString('en-IN')} {billsWord}
            </p>
          </div>
          {growth != null && (
            <div className="relative flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-fg-brand-primary">
                {growth >= 0 ? <TrendUp02 className="size-5" /> : <TrendDown02 className="size-5" />}
              </span>
              <p className="text-md">
                <span className="text-xl font-bold tabular-nums">{`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}</span>{' '}
                <span className="text-white/80">{t('vsLastMonth')}</span>
              </p>
            </div>
          )}
        </div>

        <StatTile label={t('avgOrderValue')} value={inr(analytics.avgOrderValue)} icon={Receipt} />
        <StatTile label={t('uniqueCustomers')} value={analytics.uniqueCustomers.toLocaleString('en-IN')} icon={Users01} />
        <StatTile label={t('repeatCustomerRate')} value={`${analytics.repeatRatePct.toFixed(0)}%`} icon={Repeat04} />
        {bestSeller && (
          <StatTile
            label={t('bestSellerLabel')}
            value={masalaTypeLabel(t, bestSeller.type)}
            sub={`${bestSeller.sharePct.toFixed(0)}%`}
            icon={Award01}
          />
        )}
      </div>

      {analytics.monthlyTrend.length > 1 && (
        <div className="flex flex-col gap-5 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
          <p className="text-xl font-bold text-primary">{t('monthlyTrendTitle')}</p>
          <div className="h-72">
            <ResponsiveContainer initialDimension={{ width: 1, height: 1 }} className="h-full">
              <AreaChart
                data={analytics.monthlyTrend}
                className="text-tertiary [&_.recharts-text]:text-xs"
                margin={{ top: 8, left: -4, right: 8 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" className="text-utility-brand-600" stopOpacity="0.35" />
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
                  strokeWidth={3}
                  fill="url(#fillRevenue)"
                  dot={{ className: 'fill-bg-primary stroke-utility-brand-600 stroke-2', r: 4 }}
                  activeDot={{ className: 'fill-bg-primary stroke-utility-brand-600 stroke-2', r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <Panel title={t('topItemsTitle')} className="xl:col-span-2">
          <ShareList
            rows={analytics.topItems.map((item) => ({
              key: item.type,
              label: masalaTypeLabel(t, item.type),
              value: inr(item.revenue),
              sharePct: item.sharePct,
              meta: `${item.qtyKg.toLocaleString('en-IN')} kg · ${item.bills} ${billsWord}`,
              tile: masalaTypeColorFor(item.type),
              barClass: masalaTypeColorFor(item.type).dot,
            }))}
          />
        </Panel>
        <div className="flex flex-col gap-6">
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
      </div>

      <TableCard.Root className="rounded-2xl">
        <TableCard.Header title={t('topCustomersTitle')} className="[&_h2]:text-xl [&_h2]:font-bold" />
        <Table aria-label={t('topCustomersTitle')}>
          <Table.Header>
            <Table.Head id="customer" label={t('tableCustomer')} isRowHeader />
            <Table.Head id="revenue" label={t('totalRevenue')} />
            <Table.Head id="bills" label={t('totalBills')} />
            <Table.Head id="last" label={t('lastOrderLabel')} />
          </Table.Header>
          <Table.Body items={analytics.topCustomers.map((c, i) => ({ ...c, id: c.phone, rank: i + 1 }))}>
            {(c) => (
              <Table.Row id={c.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <span
                      className={cx(
                        'w-6 shrink-0 text-center text-md font-bold tabular-nums',
                        c.rank <= 3 ? 'text-fg-brand-primary' : 'text-quaternary'
                      )}
                    >
                      {c.rank}
                    </span>
                    <Avatar
                      size="md"
                      initials={initials(c.name)}
                      contentClassName={avatarColorFor(c.phone).bg}
                      initialsClassName={avatarColorFor(c.phone).text}
                    />
                    <div className="whitespace-nowrap">
                      <p className="text-sm font-semibold text-primary">{c.name}</p>
                      <p className="text-sm text-tertiary">{c.phone}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="font-bold whitespace-nowrap text-primary tabular-nums">{inr(c.revenue)}</Table.Cell>
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
