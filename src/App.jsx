import { useState } from 'react';
import CustomerDetails from './steps/CustomerDetails.jsx';
import OrderBuilder from './steps/OrderBuilder.jsx';
import BillGenerator from './steps/BillGenerator.jsx';
import ShareOutput from './steps/ShareOutput.jsx';

const STEPS = ['customer', 'order', 'bill', 'share'];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function App() {
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
      setStep('share');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/logo-mark.png" alt="Shindraj Masale logo" className="app-logo" />
          <div>
            <h1>Shindraj Masale</h1>
            <p className="tagline">चव शिंदेंची, शान महाराष्ट्राची!</p>
          </div>
        </div>
      </header>

      <ol className="step-tracker">
        {STEPS.map((s, i) => (
          <li key={s} className={s === step ? 'active' : STEPS.indexOf(step) > i ? 'done' : ''}>
            {i + 1}. {s[0].toUpperCase() + s.slice(1)}
          </li>
        ))}
      </ol>

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
  );
}
