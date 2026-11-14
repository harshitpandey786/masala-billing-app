import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import CustomerLookupApp from './CustomerLookupApp.jsx';
import { LanguageProvider } from './i18n.jsx';
import { ADMIN_ON_SHOP_SITE, isAdminHost } from './siteConfig.js';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-devanagari';
import './styles/app.css';

const path = window.location.pathname;
const page = isAdminHost()
  ? 'admin'
  : path.startsWith('/admin') && ADMIN_ON_SHOP_SITE
    ? 'admin'
    : path.startsWith('/customers')
      ? 'customers'
      : 'billing'; // includes old /shop-admin links: App opens its Shop Admin section

const PAGES = {
  admin: AdminApp,
  customers: CustomerLookupApp,
  billing: App,
};
const Page = PAGES[page];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <Page />
    </LanguageProvider>
  </StrictMode>
);
