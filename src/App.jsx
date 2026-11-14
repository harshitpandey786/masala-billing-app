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
import { Building07, Check, Lock01, Plus, ReceiptCheck, ShoppingCart01, Users01 } from '@untitledui/icons';
import ShopAdminPanel from './shopAdmin/ShopAdminPanel.jsx';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';
import LanguageToggle from './components/LanguageToggle.jsx';
import AppShell from './components/shell/AppShell.jsx';
import PageHeader from './components/shell/PageHeader.jsx';
import staticPricingConfig from '../data/pricing-config.json' with { type: 'json' };

const STEPS = ['customer', 'order', 'bill', 'share'];
const STEP_LABEL_KEYS = {
  customer: 'stepCustomer',
  order: 'stepOrder',
  bill: 'stepBill',
  share: 'stepShare',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// /shop-admin used to be a page of its own. Old bookmarks (and the Customers
// page's sidebar link) still land here and open the Shop Admin section, then
// the address is tidied back to the shop's main link.
const openedViaShopAdminUrl = () => window.location.pathname.startsWith('/shop-admin');
const initialView = () => (openedViaShopAdminUrl() ? 'shopAdmin' : 'billing');

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
  // 'billing' or 'shopAdmin'. Switching sections keeps any bill in progress,
  // since all billing state lives here rather than in the step components.
  const [view, setView] = useState(initialView);

  useEffect(() => {
    if (openedViaShopAdminUrl()) window.history.replaceState(null, '', '/');
  }, []);
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

  // Re-fetch on the way back from Shop Admin too, so a price just changed
  // there is used on the very next bill.
  useEffect(() => {
    if (!location || view !== 'billing') return;
    let cancelled = false;
    fetchPricingConfig(location.id).then((cfg) => {
      if (!cancelled) setPricingConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, [location, view]);

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
    return <LocationLogin onLoggedIn={setLocation} />;
  }

  const stepIndex = STEPS.indexOf(step);

  const sections = [
    {
      label: t('navCounter'),
      items: [
        {
          label: t('generateNewBill'),
          icon: ShoppingCart01,
          current: view === 'billing',
          onClick: () => setView('billing'),
        },
        { label: t('customersNavLink'), icon: Users01, href: '/customers' },
      ],
    },
    {
      label: t('navShop'),
      items: [
        {
          label: t('shopAdminLink'),
          icon: Lock01,
          current: view === 'shopAdmin',
          onClick: () => setView('shopAdmin'),
        },
      ],
    },
  ];

  const footer = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Building07 className="size-5 shrink-0 text-fg-quaternary" />
          <p className="truncate text-sm font-semibold text-primary">{location.name}</p>
        </div>
        <Button size="sm" color="link-gray" onClick={handleSwitchShop}>
          {t('switchShop')}
        </Button>
      </div>
      <LanguageToggle />
    </>
  );

  return (
    <AppShell sections={sections} subtitle={t('tagline')} footer={footer}>
      {view === 'shopAdmin' && <ShopAdminPanel key={location.id} location={location} />}

      {view === 'billing' && step !== 'start' && (
        <nav aria-label={t('stepCustomer')} className="px-4 pt-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {STEPS.map((s, i) => {
              const done = stepIndex > i;
              const active = s === step;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                      active && 'bg-brand-solid text-white',
                      done && 'bg-brand-secondary text-brand-secondary',
                      !active && !done && 'bg-secondary text-quaternary ring-1 ring-secondary ring-inset'
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cx('text-sm font-semibold', active ? 'text-primary' : 'text-tertiary')}>
                    {t(STEP_LABEL_KEYS[s])}
                  </span>
                  {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border-secondary sm:w-10" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {view === 'billing' && (
        <motion.div
          key={step === 'bill' ? `bill-${billIndex}` : step}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="pb-12"
        >
          {step === 'start' && (
            <>
              <PageHeader title={location.name} description={t('startScreenHint')} />
              <div className="px-4 pt-8 lg:px-8">
                <div className="flex max-w-xl flex-col items-start gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-brand-secondary text-fg-brand-primary">
                    <ReceiptCheck className="size-6" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-lg font-semibold text-primary">{t('generateNewBill')}</p>
                    <p className="text-sm text-tertiary">{t('startScreenDetail')}</p>
                  </div>
                  <Button size="lg" iconLeading={Plus} onClick={() => setStep('customer')}>
                    {t('generateNewBill')}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'customer' && (
            <CustomerDetails customer={customer} onChange={setCustomer} onNext={() => setStep('order')} />
          )}

          {step === 'order' && (
            <OrderBuilder
              orderItems={orderItems}
              onChange={setOrderItems}
              onBack={() => setStep('customer')}
              onNext={() => advanceBilling([], 0)}
              pricingConfig={pricingConfig}
              locationId={location.id}
              customer={customer}
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

          {step === 'bill' && !orderItems[billIndex] && (
            <PageHeader title={t('stepBill')} description={t('finalizingBill')} />
          )}

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
      )}
    </AppShell>
  );
}
