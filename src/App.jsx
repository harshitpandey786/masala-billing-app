import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import CustomerDetails from './steps/CustomerDetails.jsx';
import OrderBuilder from './steps/OrderBuilder.jsx';
import BillGenerator from './steps/BillGenerator.jsx';
import ShareOutput from './steps/ShareOutput.jsx';
import LocationLogin from './steps/LocationLogin.jsx';
import { logOrderToSupabase } from './orderLogger.js';
import { decrementStock } from './productLookup.js';
import { fetchPricingConfig } from './pricingData.js';
import { getStoredLocation, clearStoredLocation } from './locationSession.js';
import { useLanguage } from './i18n.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import { CustomerIcon, OrderIcon, BillIcon, ShareIcon } from './components/StepIcons.jsx';
import staticPricingConfig from '../data/pricing-config.json' with { type: 'json' };

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

// A ready-made/loose product is already fully priced the moment it's added
// to the cart (fixed price × qty, no ingredient breakdown to edit), so it
// never needs the BillGenerator step -- it's converted straight into the
// same bill shape custom items end up with (lineItems/ingredientsSubtotal/
// makingCharge/total), just with one synthetic line item. This is what lets
// ShareOutput render every bill generically regardless of where it came from.
function synthesizeProductBill(item) {
  const amount = Math.round(item.qty * item.unitPrice);
  return {
    orderItemId: item.id,
    kind: 'product',
    type: item.name,
    qtyLabel: `${item.qty} ${item.unit === 'piece' ? 'pcs' : item.unit}`,
    recipeKey: null,
    lineItems: [{ code: item.name, qty: item.qty, unit: item.unit, amount }],
    ingredientsSubtotal: amount,
    makingCharge: 0,
    total: amount,
    productId: item.productId,
    productQty: item.qty,
  };
}

export default function App() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [location, setLocation] = useState(getStoredLocation);
  const [step, setStep] = useState('start');
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    area: '',
    pocName: '',
    billingMode: 'online',
    date: todayISO(),
  });
  const [orderItems, setOrderItems] = useState([]);
  const [billIndex, setBillIndex] = useState(0);
  const [bills, setBills] = useState([]);
  // Starts as the bundled file (synchronous, so the Order step never blocks)
  // and swaps to Supabase's live pricing as soon as that fetch resolves --
  // if it never resolves (offline, misconfigured), billing just keeps using
  // whatever shipped in the last deploy, same as before this feature existed.
  const [pricingConfig, setPricingConfig] = useState(staticPricingConfig);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    fetchPricingConfig(location.id).then((cfg) => {
      if (!cancelled) setPricingConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, [location]);

  function handleStartOver() {
    setStep('start');
    setCustomer({
      name: '',
      phone: '',
      area: '',
      pocName: '',
      billingMode: 'online',
      date: todayISO(),
    });
    setOrderItems([]);
    setBillIndex(0);
    setBills([]);
  }

  function handleSwitchShop() {
    clearStoredLocation();
    setLocation(null);
  }

  // Walks forward from `fromIndex`, instantly converting any ready-made
  // product items into their final bill shape (no UI needed for those), and
  // stops at the first custom-masala item so BillGenerator can render for
  // it. If every remaining item is a product, it logs the whole order and
  // moves straight to Share -- same as confirming the last custom item does.
  async function advanceBilling(accumulatedBills, fromIndex) {
    let idx = fromIndex;
    let acc = accumulatedBills;
    while (idx < orderItems.length && orderItems[idx].kind === 'product') {
      acc = [...acc, synthesizeProductBill(orderItems[idx])];
      idx += 1;
    }

    if (idx >= orderItems.length) {
      setStep('bill');
      const logged = await logOrderToSupabase(customer, acc, location);
      const billsWithIds = acc.map((b, i) => ({
        ...b,
        id: logged[i]?.id ?? null,
        billNo: logged[i]?.billNo ?? null,
      }));
      const productLines = acc
        .filter((b) => b.kind === 'product')
        .map((b) => ({ productId: b.productId, qty: b.productQty }));
      decrementStock(location?.id, productLines);
      setBills(billsWithIds);
      setStep('share');
      return;
    }

    setBills(acc);
    setBillIndex(idx);
    setStep('bill');
  }

  async function handleConfirmBill(bill) {
    await advanceBilling([...bills, bill], billIndex + 1);
  }

  if (!location) {
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
            </div>
          </div>
        </header>
        <div className="app-layout app-layout-single">
          <main className="app-main">
            <LocationLogin onLoggedIn={setLocation} />
          </main>
        </div>
      </div>
    );
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
            <span className="current-location-badge">{location.name}</span>
            <a className="admin-link" href="/customers">
              {t('customersNavLink')}
            </a>
            <a className="admin-link" href="/shop-admin">
              {t('shopAdminLink')}
            </a>
            <button type="button" className="admin-link admin-link-button" onClick={handleSwitchShop}>
              {t('switchShop')}
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        {step !== 'start' && (
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
        )}

        <main className="app-main">
          <motion.div
            key={step === 'bill' ? `bill-${billIndex}` : step}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
          {step === 'start' && (
            <section className="card start-screen">
              <h2>{location.name}</h2>
              <p className="hint">{t('startScreenHint')}</p>
              <div className="actions">
                <button className="btn-primary btn-accent" onClick={() => setStep('customer')}>
                  {t('generateNewBill')}
                </button>
              </div>
            </section>
          )}

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
              onNext={() => advanceBilling([], 0)}
              pricingConfig={pricingConfig}
              locationId={location.id}
            />
          )}

          {step === 'bill' && orderItems[billIndex] && (
            <BillGenerator
              key={orderItems[billIndex].id}
              orderItem={orderItems[billIndex]}
              itemNumber={billIndex + 1}
              itemCount={orderItems.length}
              onConfirm={handleConfirmBill}
              pricingConfig={pricingConfig}
            />
          )}

          {step === 'bill' && !orderItems[billIndex] && <p className="hint">{t('finalizingBill')}</p>}

          {step === 'share' && (
            <ShareOutput
              customer={customer}
              bills={bills}
              onStartOver={handleStartOver}
              pricingConfig={pricingConfig}
              location={location}
            />
          )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
