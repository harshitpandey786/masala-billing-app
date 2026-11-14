import { useState } from 'react';
import { BarChartSquare02, Building07, LogOut01, Package, ShoppingCart01, Tag03, Users01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import AppShell from '../components/shell/AppShell.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../i18n.jsx';

const SESSION_KEY = 'shindraj_admin_ok';

export default function AdminApp() {
  const { t } = useLanguage();
  const [view, setView] = useState('overview');
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  function handleUnlock() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable -- auth just won't persist across reloads.
    }
    setAuthed(true);
  }

  function handleLogOut() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  }

  const viewItem = (id, label, icon) => ({
    label,
    icon,
    onClick: () => setView(id),
    current: view === id,
  });

  const sections = [
    ...(authed
      ? [
          {
            label: t('adminNavOwner'),
            items: [
              viewItem('overview', t('analyticsTitle'), BarChartSquare02),
              viewItem('pricing', t('pricingManagerTitle'), Tag03),
              viewItem('products', t('productsManagerTitle'), Package),
              viewItem('shops', t('locationsManagerTitle'), Building07),
            ],
          },
        ]
      : []),
    {
      label: t('adminNavLinks'),
      items: [
        { label: t('backToBilling'), href: '/', icon: ShoppingCart01 },
        { label: t('customersNavLink'), href: '/customers', icon: Users01 },
      ],
    },
  ];

  return (
    <AppShell
      subtitle={t('adminTitle')}
      sections={sections}
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
      {authed ? (
        <AdminDashboard view={view} onLogOut={handleLogOut} />
      ) : (
        <AdminLogin onUnlock={handleUnlock} />
      )}
    </AppShell>
  );
}
