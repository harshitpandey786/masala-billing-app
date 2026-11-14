import { useEffect, useState } from 'react';
import { Database01, XClose } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import PageHeader from '../components/shell/PageHeader.jsx';
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
// the owner picks one shop from the shop selector and edits that shop's
// numbers, the same component a shop's own /shop-admin uses for itself.
//
// `view` comes from the sidebar in AdminApp. Filter/shop state lives here so
// it survives switching between views.
export default function AdminDashboard({ view = 'overview' }) {
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

  if (view === 'pricing') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader
          title={t('pricingManagerTitle')}
          actions={
            locations.length > 0 && (
              <Select
                size="sm"
                aria-label={t('editingShopLabel')}
                label={t('editingShopLabel')}
                className="w-56"
                items={locations.map((loc) => ({ id: loc.id, label: loc.name }))}
                selectedKey={selectedLocationId || null}
                onSelectionChange={(key) => key && setSelectedLocationId(String(key))}
              >
                {(item) => <Select.Item id={item.id} label={item.label} />}
              </Select>
            )
          }
        />
        <div className="px-4 lg:px-8">
          {selectedLocationId && <AdminPricing key={selectedLocationId} locationId={selectedLocationId} />}
        </div>
      </div>
    );
  }

  if (view === 'products') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader title={t('productsManagerTitle')} />
        <div className="px-4 lg:px-8">
          <AdminProducts />
        </div>
      </div>
    );
  }

  if (view === 'shops') {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <PageHeader title={t('locationsManagerTitle')} />
        <div className="px-4 lg:px-8">
          <AdminLocations />
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
          <Input
            type="date"
            size="sm"
            label={t('fromDate')}
            value={fromDate}
            onChange={setFromDate}
            className="w-44"
          />
          <Input type="date" size="sm" label={t('toDate')} value={toDate} onChange={setToDate} className="w-44" />
          {(fromDate || toDate) && (
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

      <AdminAnalytics fromDate={fromDate} toDate={toDate} demoMode={demoMode} locations={locations} />
    </div>
  );
}
