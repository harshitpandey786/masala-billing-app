import { useState } from 'react';
import { Lock01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import PageHeader from '../components/shell/PageHeader.jsx';
import ShopAdminLogin from './ShopAdminLogin.jsx';
import AdminPricing from '../admin/AdminPricing.jsx';
import ShopProductPricing from './ShopProductPricing.jsx';
import { useLanguage } from '../i18n.jsx';

// The shop's own pricing/product-price editor, opened from the shop app's
// sidebar. It sits behind a second, shop-specific password (separate from the
// billing login every counter employee uses) and is always scoped to the shop
// already logged in on this device -- there is no shop picker and no way to
// reach another shop's prices or the owner's dashboard from here.
//
// The unlock lives only in this component's state, never in storage: leaving
// the section, reloading, or pressing Lock all close it again, so a shared
// counter computer doesn't stay unlocked for the next person.
export default function ShopAdminPanel({ location }) {
  const { t } = useLanguage();
  const [authed, setAuthed] = useState(false);

  return (
    <>
      <PageHeader
        title={t('shopAdminTitle')}
        description={location.name}
        actions={
          authed && (
            <Button color="secondary" iconLeading={Lock01} onClick={() => setAuthed(false)}>
              {t('lockShopAdmin')}
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6 px-4 pt-6 pb-12 lg:px-8">
        {authed ? (
          <>
            <AdminPricing key={location.id} locationId={location.id} />
            <ShopProductPricing key={location.id} locationId={location.id} />
          </>
        ) : (
          <ShopAdminLogin location={location} onUnlock={() => setAuthed(true)} />
        )}
      </div>
    </>
  );
}
