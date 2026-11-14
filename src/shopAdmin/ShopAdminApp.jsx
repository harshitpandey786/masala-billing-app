import { useState } from 'react';
import { LogOut01, ShoppingCart01, Tag03, Users01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import AppShell from '../components/shell/AppShell.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import ShopAdminLogin from './ShopAdminLogin.jsx';
import AdminPricing from '../admin/AdminPricing.jsx';
import ShopProductPricing from './ShopProductPricing.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { getStoredLocation } from '../locationSession.js';
import { useLanguage } from '../i18n.jsx';

function sessionKeyFor(locationId) {
  return `shindraj_shop_admin_ok_${locationId}`;
}

// Each shop's own pricing/product-price editor -- gated by a password
// separate from that shop's billing login, and always scoped to whichever
// shop is already logged in on this device (locationSession.js). There is
// no shop picker here and no link anywhere to the owner's /admin: this page
// can only ever reach the one shop already signed in on this device.
export default function ShopAdminApp() {
  const { t } = useLanguage();
  const location = getStoredLocation();
  const [authed, setAuthed] = useState(() => {
    if (!location) return false;
    try {
      return sessionStorage.getItem(sessionKeyFor(location.id)) === '1';
    } catch {
      return false;
    }
  });

  function handleUnlock() {
    try {
      sessionStorage.setItem(sessionKeyFor(location.id), '1');
    } catch {
      // sessionStorage unavailable -- auth just won't persist across reloads.
    }
    setAuthed(true);
  }

  function handleLogOut() {
    try {
      sessionStorage.removeItem(sessionKeyFor(location.id));
    } catch {
      // ignore
    }
    setAuthed(false);
  }

  const sections = [
    {
      label: t('shopAdminTitle'),
      items: [
        { label: t('backToBilling'), href: '/', icon: ShoppingCart01 },
        { label: t('customersNavLink'), href: '/customers', icon: Users01 },
        { label: t('shopAdminLink'), href: '/shop-admin', icon: Tag03, current: true },
      ],
    },
  ];

  return (
    <AppShell
      sections={sections}
      subtitle={location?.name}
      footer={
        <>
          <LanguageToggle />
          {authed && (
            <Button size="sm" color="secondary" iconLeading={LogOut01} onClick={handleLogOut}>
              {t('logOut')}
            </Button>
          )}
        </>
      }
    >
      <PageHeader title={t('shopAdminTitle')} description={location?.name} />

      <div className="flex flex-col gap-6 px-4 pt-6 pb-12 lg:px-8">
        {!location && <p className="text-md text-tertiary">{t('shopAdminNeedsLoginHint')}</p>}
        {location && !authed && <ShopAdminLogin location={location} onUnlock={handleUnlock} />}
        {location && authed && (
          <>
            <AdminPricing key={location.id} locationId={location.id} />
            <ShopProductPricing key={location.id} locationId={location.id} />
          </>
        )}
      </div>
    </AppShell>
  );
}
