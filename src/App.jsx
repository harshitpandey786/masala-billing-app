import { useState } from 'react';
import CustomerDetails from './steps/CustomerDetails.jsx';
import OrderBuilder from './steps/OrderBuilder.jsx';
import BillGenerator from './steps/BillGenerator.jsx';
import ShareOutput from './steps/ShareOutput.jsx';
import { logOrderToSupabase } from './orderLogger.js';
import { useLanguage } from './i18n.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import { CustomerIcon, OrderIcon, BillIcon, ShareIcon } from './components/StepIcons.jsx';

const STEPS = ['customer', 'order', 'bill', 'share'];
const STEP_LABEL_KEYS = {
  customer: 'stepCustomer',
  order: 'stepOrder',
  bill: 'stepBill',
  share: 'stepShare',
};
const STEP_ICONS = {
  customer: CustomerIcon,
  order: OrderIcon,
  bill: BillIcon,
  share: ShareIcon,
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const { t } = useLanguage();
  const [step, setStep] = useState('customer');
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    area: '',
    pocName: '',
    billingMode: 'online',
    store: '',
    date: todayISO(),
  });
  const [orderItems, setOrderItems] = useState([]);
  const [billIndex, setBillIndex] = useState(0);
  const [bills, setBills] = useState([]);

  function handleStartOver() {
    setStep('customer');
    setCustomer({
      name: '',
      phone: '',
      area: '',
      pocName: '',
      billingMode: 'online',
      store: '',
      date: todayISO(),
    });
    setOrderItems([]);
    setBillIndex(0);
    setBills([]);
  }

  function handleConfirmBill(bill) {
    const nextBills = [...bills, bill];
    setBills(nextBills);
    if (billIndex + 1 < orderItems.length) {
      setBillIndex(billIndex + 1);
    } else {
      logOrderToSupabase(customer, nextBills);
      setStep('share');
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/logo-mark.png" alt="Shindraj Masale logo" className="app-logo" />
          <div className="app-header-text">
            <h1>{t('appName')}</h1>
            <p className="tagline">{t('tagline')}</p>
          </div>
          <div className="app-header-tools">
            <LanguageToggle />
            <a className="admin-link" href="/admin">
              {t('adminLink')}
            </a>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <nav className="step-rail" aria-label={t('stepCustomer')}>
          <ol>
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s];
              return (
                <li key={s} className={s === step ? 'active' : stepIndex > i ? 'done' : ''}>
                  <Icon />
                  <span className="step-rail-label">{t(STEP_LABEL_KEYS[s])}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="app-main">
          {step === 'customer' && (
            <CustomerDetails
              customer={customer}
              onChange={setCustomer}
              onNext={() => setStep('order')}
            />
          )}

          {step === 'order' && (
            <OrderBuilder
              orderItems={orderItems}
              onChange={setOrderItems}
              onBack={() => setStep('customer')}
              onNext={() => {
                setBillIndex(0);
                setStep('bill');
              }}
            />
          )}

          {step === 'bill' && orderItems[billIndex] && (
            <BillGenerator
              key={orderItems[billIndex].id}
              orderItem={orderItems[billIndex]}
              itemNumber={billIndex + 1}
              itemCount={orderItems.length}
              onConfirm={handleConfirmBill}
            />
          )}

          {step === 'share' && (
            <ShareOutput customer={customer} bills={bills} onStartOver={handleStartOver} />
          )}
        </main>
      </div>
    </div>
  );
}
