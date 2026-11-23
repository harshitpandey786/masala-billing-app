import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import CustomerDetails from './steps/CustomerDetails.jsx';
import OrderBuilder from './steps/OrderBuilder.jsx';
import BillGenerator from './steps/BillGenerator.jsx';
import FinalBill from './steps/FinalBill.jsx';
import OrderTypeChoice from './steps/OrderTypeChoice.jsx';
import MasalaDetails from './steps/MasalaDetails.jsx';
import ShareOutput from './steps/ShareOutput.jsx';
import LocationLogin from './steps/LocationLogin.jsx';
import { logOrderToSupabase } from './orderLogger.js';
import { decrementStock } from './productLookup.js';
import { fetchPricingConfig } from './pricingData.js';
import { getStoredLocation, clearStoredLocation } from './locationSession.js';
import { supabase } from './supabaseClient.js';
import { clearReorder, readReorder, resolveReorder } from './reorder.js';
import { addLedgerEntry } from './creditLedger.js';
import { useLanguage } from './i18n.jsx';
import { ArrowRight, Check, CurrencyRupee, Lock01, ReceiptCheck, ShoppingCart01, Users01 } from '@untitledui/icons';
import ShopAdminPanel from './shopAdmin/ShopAdminPanel.jsx';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';
import ShopSidebarFooter from './components/shell/ShopSidebarFooter.jsx';
import AppShell from './components/shell/AppShell.jsx';
import PageHeader from './components/shell/PageHeader.jsx';
import staticPricingConfig from '../data/pricing-config.json' with { type: 'json' };

// Customer details now come right after picking the order type, before the
// order itself is built -- one distinct screen per step, so each gets its
// own slot (unlike the old flow, where choosing the type and building the
// order shared one slot, and the final bill/confirm doubled up on another).
const CLIENT_STEP_LABEL_KEYS = ['stepOrderType', 'stepCustomer', 'stepOrder', 'stepDetails', 'stepProforma', 'stepFinalBill'];
const SCREEN_CLIENT_STEPS = {
  choose: [0],
  customer: [1],
  order: [2],
  details: [3],
  proforma: [4],
  review: [5],
  share: [6],
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// billingMode now comes from which shop is logged in, not a per-bill toggle:
// the "Online" shop (see AdminLocations.jsx's Online shop switch) always
// bills online, every other shop always bills offline.
const emptyCustomer = (location) => ({
  name: '',
  phone: '',
  area: '',
  pocName: '',
  billingMode: location?.is_online ? 'online' : 'offline',
  paymentMethod: 'cash',
  upiHandleId: null,
  date: todayISO(),
});

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// A quiet, real dashboard signal on the start screen -- today's bill count,
// revenue, and unique customers served -- instead of decoration for its own
// sake. Renders nothing until the numbers resolve (and stays silent if
// Supabase isn't configured), so there's never an empty/loading flash on the
// counter's first screen of the day.
function TodayStats({ location }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!supabase || !location) return;
    let cancelled = false;
    supabase
      .from('bills')
      .select('total, phone')
      .eq('location_id', location.id)
      .eq('order_date', todayISO())
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const revenue = data.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
        const customers = new Set(data.map((row) => row.phone).filter(Boolean)).size;
        setStats({ bills: data.length, revenue, customers });
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  if (!stats) return null;

  const tiles = [
    { icon: ReceiptCheck, value: stats.bills, label: t('todaysBillsLabel') },
    { icon: CurrencyRupee, value: inr(stats.revenue), label: t('todaysRevenueLabel') },
    { icon: Users01, value: stats.customers, label: t('customersServedLabel') },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="flex flex-col gap-3.5 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand-primary text-fg-brand-primary">
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-display-xs font-bold text-primary tabular-nums">{value}</p>
            <p className="text-sm font-medium text-tertiary">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// /shop-admin used to be a page of its own. Old bookmarks (and the Customers
// page's sidebar link) still land here and open the Shop Admin section, then
// the address is tidied back to the shop's main link.
const openedViaShopAdminUrl = () => window.location.pathname.startsWith('/shop-admin');
const initialView = () => (openedViaShopAdminUrl() ? 'shopAdmin' : 'billing');

// A ready-made/loose product is already fully priced the moment it's added
// (fixed price × qty, no ingredient breakdown to edit), so it never needs the
// proforma step -- at confirm it's converted straight into the same bill
// shape custom items end up with (lineItems/ingredientsSubtotal/
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
  const [customer, setCustomer] = useState(() => emptyCustomer(location));
  const [orderItems, setOrderItems] = useState([]);
  // Which tab the first step shows: 'custom' masala or 'readymade' products.
  const [orderMode, setOrderMode] = useState('custom');
  // Per custom-masala item id: the priced bill from its proforma, and the raw
  // edits behind it, so "Change" on the final bill reopens it as it was left.
  const [proformaBills, setProformaBills] = useState({});
  const [proformaEdits, setProformaEdits] = useState({});
  // Per custom-masala item id: what the customer asked for in step 2.
  const [masalaDetails, setMasalaDetails] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [bills, setBills] = useState([]);
  // Starts as the bundled file (synchronous, so the Order step never blocks)
  // and swaps to Supabase's live pricing as soon as that fetch resolves --
  // if it never resolves (offline, misconfigured), billing just keeps using
  // whatever shipped in the last deploy, same as before this feature existed.
  const [pricingConfig, setPricingConfig] = useState(staticPricingConfig);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  // An "Order again" handed over from the Customers page, applied once this
  // shop's live pricing is in so custom masala maps onto today's recipes.
  const [pendingReorder, setPendingReorder] = useState(readReorder);
  const [reorderInfo, setReorderInfo] = useState(null);

  // Re-fetch on the way back from Shop Admin too, so a price just changed
  // there is used on the very next bill.
  useEffect(() => {
    if (!location || view !== 'billing') return;
    let cancelled = false;
    fetchPricingConfig(location.id).then((cfg) => {
      if (cancelled) return;
      setPricingConfig(cfg);
      setPricingLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [location, view]);

  useEffect(() => {
    if (!pendingReorder || !location || !pricingLoaded) return;
    let cancelled = false;
    clearReorder();
    resolveReorder(pendingReorder, { locationId: location.id, pricingConfig }).then(({ items, skipped }) => {
      if (cancelled) return;
      setCustomer({ ...emptyCustomer(location), ...pendingReorder.customer });
      setOrderItems(items);
      setOrderMode(items.some((i) => i.kind === 'custom') ? 'custom' : 'readymade');
      setProformaBills({});
      setProformaEdits({});
      setMasalaDetails({});
      setBills([]);
      setReorderInfo({ fromDate: pendingReorder.fromDate, skipped });
      setView('billing');
      setStep('order');
      setPendingReorder(null);
    });
    return () => {
      cancelled = true;
    };
  }, [pendingReorder, location, pricingLoaded, pricingConfig]);

  function handleStartOver() {
    setStep('start');
    setCustomer(emptyCustomer(location));
    setOrderItems([]);
    setProformaBills({});
    setProformaEdits({});
    setMasalaDetails({});
    setEditingId(null);
    setBills([]);
    setReorderInfo(null);
  }

  // Logging out also drops any bill in progress, so whoever signs in next
  // never sees the previous person's customer or cart.
  function handleLogOut() {
    clearStoredLocation();
    handleStartOver();
    setView('billing');
    setLocation(null);
  }

  // Opens the details (step 2) for the next custom masala that doesn't have
  // a proforma yet, or the final bill once they all do.
  function goToNextProforma(saved = proformaBills) {
    const next = orderItems.find((i) => i.kind === 'custom' && !saved[i.id]);
    if (next) {
      setEditingId(next.id);
      setStep('details');
      return;
    }
    setStep('review');
  }

  function handleDetailsSaved(details) {
    setMasalaDetails({ ...masalaDetails, [editingId]: details });
    setStep('proforma');
  }

  function handleProformaSaved(bill, edits) {
    const saved = { ...proformaBills, [editingId]: bill };
    setProformaBills(saved);
    setProformaEdits({ ...proformaEdits, [editingId]: edits });
    goToNextProforma(saved);
  }

  function handleEditItem(id) {
    setEditingId(id);
    setStep('proforma');
  }

  // Only here is the bill saved -- once confirmed, from the final bill
  // screen, it's final.
  async function handleConfirmOrder() {
    setConfirming(true);
    const finalBills = orderItems.map((item) =>
      item.kind === 'product'
        ? synthesizeProductBill(item)
        : { ...proformaBills[item.id], details: masalaDetails[item.id] ?? null }
    );
    const logged = await logOrderToSupabase(customer, finalBills, location);
    const productLines = finalBills
      .filter((b) => b.kind === 'product')
      .map((b) => ({ productId: b.productId, qty: b.productQty }));
    decrementStock(location?.id, productLines);
    // "Credit" is a payment method, not just a note -- the customer now
    // owes this bill's total, so it goes straight into their khata balance
    // instead of the shop having to remember to log it separately.
    if (customer.paymentMethod === 'credit') {
      const billNo = logged.find((b) => b?.billNo)?.billNo;
      addLedgerEntry({
        phone: customer.phone,
        customerName: customer.name,
        locationId: location?.id,
        entryType: 'charge',
        amount: finalBills.reduce((sum, b) => sum + b.total, 0),
        note: billNo ? `${t('billNoLabel')} ${billNo}` : null,
      });
    }
    setBills(finalBills.map((b, i) => ({ ...b, id: logged[i]?.id ?? null, billNo: logged[i]?.billNo ?? null })));
    setConfirming(false);
    setStep('share');
  }

  if (!location) {
    return <LocationLogin onLoggedIn={setLocation} />;
  }

  const screenSteps = SCREEN_CLIENT_STEPS[step] || [];
  const customItems = orderItems.filter((i) => i.kind === 'custom');
  const editingItem = step === 'proforma' || step === 'details' ? orderItems.find((i) => i.id === editingId) : null;

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

  const footer = <ShopSidebarFooter location={location} onLogOut={handleLogOut} />;

  return (
    <AppShell sections={sections} subtitle={t('tagline')} footer={footer}>
      {view === 'shopAdmin' && <ShopAdminPanel key={location.id} location={location} />}

      {view === 'billing' && step !== 'start' && (
        <nav aria-label={t('billingStepsLabel')} className="px-4 pt-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {CLIENT_STEP_LABEL_KEYS.map((labelKey, i) => {
              const active = screenSteps.includes(i);
              const done = i < Math.min(...screenSteps);
              return (
                <li key={labelKey} className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex size-7 items-center justify-center rounded-full text-sm font-bold',
                      active && 'bg-brand-solid text-white shadow-sm',
                      done && 'bg-brand-secondary text-brand-secondary',
                      !active && !done && 'bg-secondary text-quaternary ring-1 ring-secondary ring-inset'
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span
                    className={cx(
                      'text-sm font-semibold',
                      active ? 'text-primary' : 'hidden text-tertiary md:inline'
                    )}
                  >
                    {t(labelKey)}
                  </span>
                  {i < CLIENT_STEP_LABEL_KEYS.length - 1 && <span className="mx-1 h-px w-4 bg-border-secondary sm:w-8" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {view === 'billing' && (
        <motion.div
          key={step === 'proforma' || step === 'details' ? `${step}-${editingId}` : step}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="pb-12"
        >
          {step === 'start' && (
            <>
              <PageHeader title={location.name} description={t('startScreenHint')} />
              <div className="flex flex-col gap-5 px-4 pt-8 lg:px-8">
                <TodayStats location={location} />

                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="group relative flex w-full items-center justify-between gap-5 overflow-hidden rounded-xl bg-brand-solid px-6 py-7 text-left shadow-md transition duration-150 ease-linear hover:bg-brand-solid_hover"
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-cover bg-center opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]"
                    style={{ backgroundImage: "url('/products/5745.jpg')" }}
                  />
                  <div className="relative flex items-center gap-5">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
                      <ShoppingCart01 className="size-6" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-xl font-bold text-white">{t('generateNewBill')}</p>
                      <p className="max-w-md text-sm text-white/80">{t('startScreenDetail')}</p>
                    </div>
                  </div>
                  <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-fg-brand-primary transition-transform duration-150 ease-linear group-hover:translate-x-1">
                    <ArrowRight className="size-5" />
                  </span>
                </button>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setView('shopAdmin')}
                    className="group flex w-full items-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-left shadow-xs ring-1 ring-secondary ring-inset transition duration-150 ease-linear hover:bg-secondary"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-brand-primary ring-1 ring-secondary ring-inset">
                      <Lock01 className="size-4.5" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-sm font-semibold text-primary">{t('shopAdminLink')}</p>
                      <p className="truncate text-xs text-tertiary">{t('shopAdminLoginHint')}</p>
                    </div>
                    <ArrowRight className="ml-auto size-4 shrink-0 text-fg-quaternary transition-transform duration-150 ease-linear group-hover:translate-x-1" />
                  </button>

                  <a
                    href="/customers"
                    className="group flex w-full items-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-left shadow-xs ring-1 ring-secondary ring-inset transition duration-150 ease-linear hover:bg-secondary"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-brand-primary ring-1 ring-secondary ring-inset">
                      <Users01 className="size-4.5" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-sm font-semibold text-primary">{t('customersNavLink')}</p>
                      <p className="truncate text-xs text-tertiary">{t('customersCardHint')}</p>
                    </div>
                    <ArrowRight className="ml-auto size-4 shrink-0 text-fg-quaternary transition-transform duration-150 ease-linear group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </>
          )}

          {step === 'choose' && (
            <OrderTypeChoice
              onChoose={(mode) => {
                setOrderMode(mode);
                setStep('customer');
              }}
              onBack={() => setStep('start')}
            />
          )}

          {step === 'customer' && (
            <CustomerDetails
              customer={customer}
              onChange={setCustomer}
              onBack={() => setStep('choose')}
              onNext={() => setStep('order')}
            />
          )}

          {step === 'order' && (
            <OrderBuilder
              orderItems={orderItems}
              onChange={setOrderItems}
              onBack={() => setStep('customer')}
              onNext={() => goToNextProforma()}
              mode={orderMode}
              onModeChange={setOrderMode}
              pricingConfig={pricingConfig}
              locationId={location.id}
              customer={customer}
              reorderInfo={reorderInfo}
            />
          )}

          {editingItem && step === 'details' && (
            <MasalaDetails
              key={editingItem.id}
              orderItem={editingItem}
              itemNumber={customItems.indexOf(editingItem) + 1}
              itemCount={customItems.length}
              initialDetails={masalaDetails[editingItem.id]}
              onNext={handleDetailsSaved}
              onBack={() => setStep(proformaBills[editingItem.id] ? 'proforma' : 'order')}
              pricingConfig={pricingConfig}
            />
          )}

          {editingItem && step === 'proforma' && (
            <BillGenerator
              key={editingItem.id}
              orderItem={editingItem}
              itemNumber={customItems.indexOf(editingItem) + 1}
              itemCount={customItems.length}
              isLast={!customItems.some((i) => i.id !== editingItem.id && !proformaBills[i.id])}
              initialEdits={proformaEdits[editingItem.id]}
              details={masalaDetails[editingItem.id]}
              onConfirm={handleProformaSaved}
              onBack={() => setStep('details')}
              pricingConfig={pricingConfig}
            />
          )}

          {step === 'review' && (
            <FinalBill
              orderItems={orderItems}
              proformaBills={proformaBills}
              masalaDetails={masalaDetails}
              onChange={setOrderItems}
              onEditItem={handleEditItem}
              onBack={() => setStep('order')}
              onNext={handleConfirmOrder}
              isSubmitting={confirming}
              pricingConfig={pricingConfig}
              locationId={location.id}
              customer={customer}
              onCustomerChange={setCustomer}
            />
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
