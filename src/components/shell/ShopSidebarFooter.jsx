import { Building07, LogOut01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import LanguageToggle from '../LanguageToggle.jsx';
import { useLanguage } from '../../i18n.jsx';

// Sidebar footer for the shop-side pages (Billing, Customers): which shop is
// signed in, a Log out button, and the language switch.
export default function ShopSidebarFooter({ location, onLogOut }) {
  const { t } = useLanguage();
  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Building07 className="size-5 shrink-0 text-fg-quaternary" />
        <p className="truncate text-sm font-semibold text-primary">{location.name}</p>
      </div>
      <LanguageToggle />
      <Button size="sm" color="secondary" iconLeading={LogOut01} onClick={onLogOut}>
        {t('logOut')}
      </Button>
    </>
  );
}
