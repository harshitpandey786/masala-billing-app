import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import CustomerLookupApp from './CustomerLookupApp.jsx';
import { LanguageProvider } from './i18n.jsx';
import './styles.css';

const path = window.location.pathname;
const page = path.startsWith('/admin') ? 'admin' : path.startsWith('/customers') ? 'customers' : 'billing';

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
