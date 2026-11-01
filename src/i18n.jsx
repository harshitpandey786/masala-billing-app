import { createContext, useContext, useEffect, useState } from 'react';

// Marathi is the shop's working language; English stays available for anyone
// more comfortable with it. Keys are grouped by screen for easy scanning --
// add a key here, then reference it with t('key') wherever it's needed.
const STRINGS = {
  en: {
    appName: 'Shindraj Masale',
    tagline: "Taste of Shinde's, pride of Maharashtra",
    stepCustomer: 'Customer',
    stepOrder: 'Order',
    stepBill: 'Bill',
    stepShare: 'Share',
    adminLink: 'Admin',
    backToBilling: 'Back to billing',

    customerDetailsTitle: 'Customer Details',
    customerName: 'Customer Name',
    customerNamePlaceholder: 'e.g. Suresh Patil',
    phoneNumber: 'Phone Number',
    phonePlaceholder: 'e.g. 98200 12345',
    areaPlace: 'Area / Place',
    areaPlaceholder: 'e.g. Lalbaug, Mumbai',
    billMadeBy: 'Bill Made By (POC)',
    selectPoc: 'Select POC',
    date: 'Date',
    billingMode: 'Billing Mode',
    online: 'Online',
    offline: 'Offline',
    store: 'Store',
    selectStore: 'Select store',
    lalbaug: 'Lalbaug',
    sewri: 'Sewri',
    next: 'Next',
    fillAllFields: 'Please fill in all fields',
    andSelectStore: ' and select a store',

    orderBuilderTitle: 'Order Builder',
    masalaType: 'Masala Type',
    quantityKg: 'Quantity (kg)',
    addItem: '+ Add',
    remove: 'Remove',
    noItemsYet: 'No items added yet.',
    back: 'Back',
    generateBills: 'Generate Bills',

    billTitle: 'Bill',
    of: 'of',
    particulars: 'Particulars',
    quantity: 'Quantity',
    amount: 'Amount (₹)',
    ingredientsSubtotal: 'Ingredients Subtotal',
    makingCharge: 'Making Charge',
    total: 'Total',
    addedSuffix: '(added)',
    qtyGramsPlaceholder: 'Qty (g)',
    addChiliIngredient: '+ Add Chili/Ingredient',
    confirmBill: 'Confirm Bill',

    billSummary: 'Bill Summary',
    combinedOrderSummary: 'Combined Order Summary',
    billMadeByLabel: 'Bill made by',
    grandTotal: 'Grand Total',
    preparingImage: 'Preparing bill image…',
    couldNotGenerateImage: "Couldn't generate the bill image.",
    retry: 'Retry',
    startNewOrder: 'Start New Order',
    downloadImage: 'Download Image',
    downloadPdf: 'Download PDF',
    preparingPdf: 'Preparing PDF…',
    shareToWhatsapp: 'Share to WhatsApp',
    followUsAt: 'Follow us at',

    adminTitle: 'Order Search',
    adminSubtitle: 'Look up any customer’s order history',
    enterPassword: 'Enter the owner password to continue',
    password: 'Password',
    unlock: 'Unlock',
    wrongPassword: 'Incorrect password.',
    searchPlaceholder: 'Search by name or phone number…',
    fromDate: 'From',
    toDate: 'To',
    clearFilters: 'Clear',
    totalBills: 'Bills',
    totalRevenue: 'Revenue',
    uniqueCustomers: 'Customers',
    noResults: 'No bills match your search yet.',
    loadingResults: 'Loading order history…',
    loadError: 'Could not load order history. Check the connection and try again.',
    tableDate: 'Date',
    tableCustomer: 'Customer',
    tablePhone: 'Phone',
    tableType: 'Type',
    tableQty: 'Qty',
    tableTotal: 'Total',
    viewDetails: 'View',
    hideDetails: 'Hide',
    logOut: 'Log out',
    notConfigured: 'Supabase isn’t configured for this app yet — nothing to search.',

    langToggleLabel: 'Language',

    masalaType_malvani: 'Malvani',
    masalaType_ghati: 'Ghati',
  },
  mr: {
    appName: 'शिंदराज मसाले',
    tagline: 'चव शिंदेंची, शान महाराष्ट्राची!',
    stepCustomer: 'ग्राहक',
    stepOrder: 'ऑर्डर',
    stepBill: 'बिल',
    stepShare: 'शेअर',
    adminLink: 'अॅडमिन',
    backToBilling: 'बिलिंगकडे परत',

    customerDetailsTitle: 'ग्राहकाची माहिती',
    customerName: 'ग्राहकाचे नाव',
    customerNamePlaceholder: 'उदा. सुरेश पाटील',
    phoneNumber: 'फोन नंबर',
    phonePlaceholder: 'उदा. ९८२०० १२३४५',
    areaPlace: 'परिसर / ठिकाण',
    areaPlaceholder: 'उदा. लालबाग, मुंबई',
    billMadeBy: 'बिल तयार केले (POC)',
    selectPoc: 'POC निवडा',
    date: 'तारीख',
    billingMode: 'बिलिंग पद्धत',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    store: 'दुकान',
    selectStore: 'दुकान निवडा',
    lalbaug: 'लालबाग',
    sewri: 'शिवडी',
    next: 'पुढे',
    fillAllFields: 'कृपया सर्व माहिती भरा',
    andSelectStore: ' आणि दुकान निवडा',

    orderBuilderTitle: 'ऑर्डर तयार करा',
    masalaType: 'मसाल्याचा प्रकार',
    quantityKg: 'प्रमाण (किलो)',
    addItem: '+ जोडा',
    remove: 'काढा',
    noItemsYet: 'अजून कोणताही पदार्थ जोडलेला नाही.',
    back: 'मागे',
    generateBills: 'बिल तयार करा',

    billTitle: 'बिल',
    of: 'पैकी',
    particulars: 'तपशील',
    quantity: 'प्रमाण',
    amount: 'रक्कम (₹)',
    ingredientsSubtotal: 'साहित्य उपएकूण',
    makingCharge: 'बनावट खर्च',
    total: 'एकूण',
    addedSuffix: '(जोडलेले)',
    qtyGramsPlaceholder: 'प्रमाण (ग्रॅम)',
    addChiliIngredient: '+ मिरची/साहित्य जोडा',
    confirmBill: 'बिल निश्चित करा',

    billSummary: 'बिल तपशील',
    combinedOrderSummary: 'एकत्रित ऑर्डर तपशील',
    billMadeByLabel: 'बिल तयार केले',
    grandTotal: 'एकूण रक्कम',
    preparingImage: 'बिलाची इमेज तयार होत आहे...',
    couldNotGenerateImage: 'बिलाची इमेज तयार होऊ शकली नाही.',
    retry: 'पुन्हा प्रयत्न करा',
    startNewOrder: 'नवीन ऑर्डर सुरू करा',
    downloadImage: 'इमेज डाउनलोड करा',
    downloadPdf: 'पीडीएफ डाउनलोड करा',
    preparingPdf: 'पीडीएफ तयार होत आहे...',
    shareToWhatsapp: 'व्हॉट्सअॅपवर शेअर करा',
    followUsAt: 'आम्हाला फॉलो करा',

    adminTitle: 'ऑर्डर शोध',
    adminSubtitle: 'कोणत्याही ग्राहकाचा ऑर्डर इतिहास पहा',
    enterPassword: 'पुढे जाण्यासाठी मालकाचा पासवर्ड टाका',
    password: 'पासवर्ड',
    unlock: 'उघडा',
    wrongPassword: 'चुकीचा पासवर्ड.',
    searchPlaceholder: 'नाव किंवा फोन नंबरने शोधा...',
    fromDate: 'पासून',
    toDate: 'पर्यंत',
    clearFilters: 'साफ करा',
    totalBills: 'बिले',
    totalRevenue: 'उत्पन्न',
    uniqueCustomers: 'ग्राहक',
    noResults: 'अजून कोणतेही जुळणारे बिल नाही.',
    loadingResults: 'ऑर्डर इतिहास लोड होत आहे...',
    loadError: 'ऑर्डर इतिहास लोड होऊ शकला नाही. कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
    tableDate: 'तारीख',
    tableCustomer: 'ग्राहक',
    tablePhone: 'फोन',
    tableType: 'प्रकार',
    tableQty: 'प्रमाण',
    tableTotal: 'एकूण',
    viewDetails: 'पहा',
    hideDetails: 'लपवा',
    logOut: 'लॉग आउट',
    notConfigured: 'या अॅपसाठी Supabase अजून सेट केलेले नाही — शोधण्यासाठी काही नाही.',

    langToggleLabel: 'भाषा',

    masalaType_malvani: 'मालवणी',
    masalaType_ghati: 'घाटी',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('shindraj_lang') || 'mr';
    } catch {
      return 'mr';
    }
  });

  function changeLang(next) {
    setLang(next);
    try {
      localStorage.setItem('shindraj_lang', next);
    } catch {
      // localStorage unavailable (private mode, etc.) -- just don't persist.
    }
  }

  function t(key) {
    return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  }

  // Swaps the whole page's font stack between the Devanagari-first and
  // Latin-first families (see html[lang="mr"] in styles.css) -- CSS font
  // fallback alone can't do this, since Noto Sans Devanagari also carries
  // its own Latin glyphs and would use those instead of falling through.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

// Masala type names (Malvani, Ghati, ...) come from the pricing config's recipe
// keys, so new types can appear without a matching translation yet -- fall back
// to a capitalized version of the raw key rather than showing a missing string.
export function masalaTypeLabel(t, type) {
  const key = `masalaType_${type}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function storeLabel(t, store) {
  if (store === 'lalbaug') return t('lalbaug');
  if (store === 'sewri') return t('sewri');
  return store;
}
