import { useEffect, useState } from 'react';
import { Database01, XClose } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { cx } from '@/utils/cx';
import PageHeader from '../components/shell/PageHeader.jsx';
import { supabase } from '../supabaseClient.js';
import { DEMO_STORAGE_KEY, getInitialDemoMode } from './demoData.js';
import { useLanguage } from '../i18n.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminPricing from './AdminPricing.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminLocations from './AdminLocations.jsx';
import AdminUpiHandles from './AdminUpiHandles.jsx';
import OutstandingCredit from './OutstandingCredit.jsx';

// Owner-only: business analytics, and per-shop pricing/product control.
// Looking up a specific customer's order history is a front-of-house task
// now, done on the public /customers page instead -- no password needed for
// that.
//
// Pricing and product prices are fully independent per shop (see
// docs/supabase-setup.md §9), so there's no "edit all shops at once" view --
// the owner picks one shop from the shop selector and edits that shop's
// numbers, the same component a shop's own Shop Admin section uses for itself.
//
const isoDay = (d) => d.toISOString().slice(0, 10);

// Quick date ranges for the analytics; the From/To pickers still allow any
// custom range. Same UTC day convention as the bills' order_date.
function quickRanges() {
  const now = new Date();
  const today = isoDay(now);
  const daysAgo = (n) => isoDay(new Date(now.getTime() - n * 86400000));
  return [
    { id: 'all', labelKey: 'rangeAllTime', from: '', to: '' },
    { id: 'today', labelKey: 'rangeToday', from: today, to: today },
    { id: '7d', labelKey: 'rangeLast7Days', from: daysAgo(6), to: today },
    { id: '30d', labelKey: 'rangeLast30Days', from: daysAgo(29), to: today },
    { id: 'month', labelKey: 'rangeThisMonth', from: `${today.slice(0, 8)}01`, to: today },
  ];
}

// Same shop picker the Pricing page uses, pulled out so the Shops page (for
// its per-shop UPI handles) can use it too.
function ShopSelector({ locations, selectedLocationId, onSelect, label }) {
  if (locations.length === 0) return null;
  if (locations.length <= 6) {
    return (
      <Segmented
        label={label}
        items={locations.map((loc) => ({ id: loc.id, label: loc.name }))}
        activeId={selectedLocationId}
        onSelect={(item) => onSelect(item.id)}
      />
    );
  }
  return (
    <Select
      size="md"
      aria-label={label}
      label={label}
      className="w-64"
      items={locations.map((loc) => ({ id: loc.id, label: loc.name }))}
      selectedKey={selectedLocationId || null}
      onSelectionChange={(key) => key && onSelect(String(key))}
    >
      {(item) => <Select.Item id={item.id} label={item.label} />}
    </Select>
  );
}

function Segmented({ items, activeId, onSelect, label }) {
  return (
    <div role="group" aria-label={label} className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-primary p-1 shadow-xs ring-1 ring-secondary ring-inset">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item)}
            className={cx(
              'rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition duration-100 ease-linear',
              active ? 'bg-brand-solid text-white shadow-sm' : 'text-tertiary hover:bg-secondary hover:text-secondary'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// `view` comes from the sidebar in AdminApp. Filter/shop state lives here so
// it survives switching between views.
export default function AdminDashboard({ view = 'overview' }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  function reloadLocations() {
    if (!supabase) return;
    supabase
      .from('locations')
      .select('id, name')
      .order('created_at')
      .then(({ data, error }) => {
        if (error || !data) return;
        setLocations(data);
        setSelectedLocationId((prev) => (data.some((loc) => loc.id === prev) ? prev : data[0]?.id || ''));
      });
  }

  // Re-run when a shop is added/renamed in AdminLocations below, so its
  // selector (used here and on the Pricing page) picks up the change
  // without needing a full page reload.
  useEffect(() => {
    reloadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const ranges = quickRanges();
  const activeRangeId = ranges.find((r) => r.from === fromDate && r.to === toDate)?.id ?? 'custom';

  if (view === 'pricing') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader title={t('pricingManagerTitle')} description={t('pricingPageHint')}>
          <ShopSelector locations={locations} selectedLocationId={selectedLocationId} onSelect={setSelectedLocationId} label={t('editingShopLabel')} />
        </PageHeader>
        <div className="px-4 lg:px-8">
          {selectedLocationId && <AdminPricing key={selectedLocationId} locationId={selectedLocationId} />}
        </div>
      </div>
    );
  }

  if (view === 'products') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader title={t('productsManagerTitle')} description={t('productsPageHint')} />
        <div className="px-4 lg:px-8">
          <AdminProducts />
        </div>
      </div>
    );
  }

  if (view === 'shops') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader title={t('locationsManagerTitle')} description={t('shopsPageHint')} />
        <div className="flex flex-col gap-6 px-4 lg:px-8">
          <AdminLocations onChanged={reloadLocations} />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <ShopSelector
              locations={locations}
              selectedLocationId={selectedLocationId}
              onSelect={setSelectedLocationId}
              label={t('editingShopLabel')}
            />
          </div>
          {selectedLocationId && <AdminUpiHandles key={selectedLocationId} locationId={selectedLocationId} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <PageHeader
        title={t('analyticsTitle')}
        description={t('analyticsSubtitle')}
        actions={
          <Button size="md" color={demoMode ? 'primary' : 'secondary'} iconLeading={Database01} onClick={toggleDemoMode}>
            {demoMode ? 'Show live data' : 'Show demo data'}
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <Segmented
            label={t('dateRangeLabel')}
            items={ranges.map((r) => ({ ...r, label: t(r.labelKey) }))}
            activeId={activeRangeId}
            onSelect={(r) => {
              setFromDate(r.from);
              setToDate(r.to);
            }}
          />
          <Input
            type="date"
            size="sm"
            label={t('fromDate')}
            value={fromDate}
            onChange={setFromDate}
            className="w-40 sm:w-44"
          />
          <Input type="date" size="sm" label={t('toDate')} value={toDate} onChange={setToDate} className="w-40 sm:w-44" />
          {activeRangeId === 'custom' && (
            <Button
              size="sm"
              color="secondary"
              iconLeading={XClose}
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
            >
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="px-4 lg:px-8">
        <OutstandingCredit />
      </div>

      <AdminAnalytics fromDate={fromDate} toDate={toDate} demoMode={demoMode} locations={locations} />
    </div>
  );
}
