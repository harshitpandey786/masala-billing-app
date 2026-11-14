import { useState } from 'react';
import { Lock01, ShoppingCart01, Users01 } from '@untitledui/icons';
import AppShell from './components/shell/AppShell.jsx';
import PageHeader from './components/shell/PageHeader.jsx';
import CustomerList from './admin/CustomerList.jsx';
import CustomerDetail from './admin/CustomerDetail.jsx';
import ShopSidebarFooter from './components/shell/ShopSidebarFooter.jsx';
import LocationLogin from './steps/LocationLogin.jsx';
import { getStoredLocation, clearStoredLocation } from './locationSession.js';
import { useLanguage } from './i18n.jsx';

// Front-of-house customer lookup. It needs the same shop sign-in as billing
// (customer names and phone numbers are private), but no extra password:
// any signed-in operator can find a returning customer and see their order
// history. Business-wide numbers (revenue, growth, top customers) stay on
// the owner's dashboard.
export default function CustomerLookupApp() {
  const { t } = useLanguage();
  const [location, setLocation] = useState(getStoredLocation);
  const [selectedPhone, setSelectedPhone] = useState(null);

  if (!location) return <LocationLogin onLoggedIn={setLocation} />;

  function handleLogOut() {
    clearStoredLocation();
    setSelectedPhone(null);
    setLocation(null);
  }

  const sections = [
    {
      label: t('appName'),
      items: [
        { label: t('backToBilling'), href: '/', icon: ShoppingCart01 },
        { label: t('customersNavLink'), href: '/customers', icon: Users01, current: true },
        { label: t('shopAdminLink'), href: '/shop-admin', icon: Lock01 },
      ],
    },
  ];

  return (
    <AppShell
      sections={sections}
      subtitle={t('customerLookupTitle')}
      footer={<ShopSidebarFooter location={location} onLogOut={handleLogOut} />}
    >
      {!selectedPhone && <PageHeader title={t('customerLookupTitle')} description={t('adminSubtitle')} />}

      <div className="px-4 pt-6 pb-12 lg:px-8">
        {selectedPhone ? (
          <div className="pt-2">
            <CustomerDetail phone={selectedPhone} demoMode={false} onBack={() => setSelectedPhone(null)} />
          </div>
        ) : (
          <CustomerList demoMode={false} showStats={false} onSelectCustomer={setSelectedPhone} />
        )}
      </div>
    </AppShell>
  );
}
