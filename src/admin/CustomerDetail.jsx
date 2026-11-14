import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from '@untitledui/icons';
import { Avatar } from '@/components/base/avatar/avatar';
import { Button } from '@/components/base/buttons/button';
import { supabase } from '../supabaseClient.js';
import { useLanguage, masalaTypeLabel, channelLabel } from '../i18n.jsx';
import { DEMO_ROWS } from './demoData.js';
import { computeAnalytics } from './analytics.js';
import BillLedgerTable from './BillLedgerTable.jsx';

function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
      <p className="text-sm font-medium text-tertiary">{label}</p>
      <p className="truncate text-lg font-semibold text-primary tabular-nums">{value}</p>
    </div>
  );
}

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
    <section className="flex flex-col gap-6">
      <div>
        <Button size="sm" color="link-gray" iconLeading={ArrowLeft} onClick={onBack}>
          {t('backToCustomers')}
        </Button>
      </div>

      {status === 'loading' && <p className="text-sm text-tertiary">{t('loadingResults')}</p>}
      {status === 'error' && <p className="text-sm text-error-primary">{t('loadError')}</p>}
      {status === 'not_configured' && <p className="text-sm text-tertiary">{t('notConfigured')}</p>}

      {status === 'ready' && profile && (
        <>
          <div className="flex items-center gap-4">
            <Avatar size="xl" initials={initialsOf(profile.name)} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="truncate text-display-xs font-semibold text-primary">{profile.name}</h2>
              <p className="text-md text-tertiary">
                {profile.phone}
                {profile.area ? ` · ${profile.area}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={t('totalSpent')} value={inr(profile.totalSpent)} />
            <Stat label={t('totalBills')} value={profile.totalBills} />
            <Stat label={t('avgOrderValue')} value={inr(profile.avgOrderValue)} />
            <Stat
              label={t('favoriteItem')}
              value={profile.favoriteItem ? masalaTypeLabel(t, profile.favoriteItem.type) : '—'}
            />
            <Stat
              label={t('firstOrderLabel')}
              value={profile.firstOrderDate ? dateFormatter.format(new Date(profile.firstOrderDate)) : '—'}
            />
            <Stat
              label={t('lastOrderLabel')}
              value={profile.lastOrderDate ? dateFormatter.format(new Date(profile.lastOrderDate)) : '—'}
            />
            <Stat
              label={t('orderFrequencyLabel')}
              value={profile.orderFrequencyDays != null ? `~${Math.round(profile.orderFrequencyDays)} ${t('daysUnit')}` : '—'}
            />
            <Stat
              label={t('preferredChannelLabel')}
              value={profile.preferredChannel ? channelLabel(t, profile.preferredChannel.key) : '—'}
            />
          </div>

          <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <div className="border-b border-secondary px-4 py-5 md:px-6">
              <h3 className="text-md font-semibold text-primary">{t('tableOrders')}</h3>
            </div>
            <BillLedgerTable rows={bills} />
          </div>
        </>
      )}
    </section>
  );
}
