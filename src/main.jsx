import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { LanguageProvider } from './i18n.jsx';
import './styles.css';

const isAdminRoute = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>{isAdminRoute ? <AdminApp /> : <App />}</LanguageProvider>
  </StrictMode>
);
