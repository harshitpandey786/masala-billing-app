import { useState } from 'react';
import { Lock01, ShoppingCart01, Users01 } from '@untitledui/icons';
import AppShell from './components/shell/AppShell.jsx';
import PageHeader from './components/shell/PageHeader.jsx';
import CustomerList from './admin/CustomerList.jsx';
import CustomerDetail from './admin/CustomerDetail.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import { useLanguage } from './i18n.jsx';

// Front-of-house customer lookup -- no password. Any operator can find a
// returning customer and see their order history while billing; the
// business-wide numbers (revenue, growth, top customers) stay admin-only on
// /admin, which is the only real difference between this and the old
// admin-embedded version.
export default function CustomerLookupApp() {
  const { t } = useLanguage();
  const [selectedPhone, setSelectedPhone] = useState(null);

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
    <AppShell sections={sections} subtitle={t('customerLookupTitle')} footer={<LanguageToggle />}>
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
