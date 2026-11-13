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
    lalbaug: 'Lalbaug',
    sewri: 'Sewri',
    next: 'Next',
    fillAllFields: 'Please fill in all fields',

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
    savingBill: 'Saving…',

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
    billNoLabel: 'Bill No',
    billNotesLabel: 'Special Instructions',
    billNotesPlaceholder: 'e.g. Less chilli, no salt…',
    billNotesHint: 'Shown on the shared bill. Updates it automatically.',

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

    customerLookupTitle: 'Customer Lookup',
    analyticsTitle: 'Business Analytics',
    avgOrderValue: 'Avg Order Value',
    monthlyGrowth: 'Growth (MoM)',
    repeatCustomerRate: 'Repeat Customers',
    monthlyTrendTitle: 'Revenue Trend',
    topItemsTitle: 'Best-Selling Masala Types',
    channelBreakdownTitle: 'Revenue by Channel',
    topCustomersTitle: 'Top Customers',
    lastOrderLabel: 'Last Order',
    noAnalyticsData: 'No orders in this period yet.',

    tableArea: 'Area',
    tableOrders: 'Orders',
    tableTotalSpent: 'Total Spent',
    totalSpent: 'Total Spent',
    favoriteItem: 'Favorite',
    firstOrderLabel: 'First Order',
    backToCustomers: 'Back to customers',
    noCustomersFound: 'No customers match your search yet.',
    customersNavLink: 'Customers',

    cancel: 'Cancel',
    save: 'Save',
    saved: 'Saved',
    pricingManagerTitle: 'Pricing',
    ingredientRateCardTitle: 'Ingredient Rates',
    tableCode: 'Code',
    tableNameEn: 'Name (English)',
    tableNameMr: 'Name (Marathi)',
    tablePricePerKg: 'Price/kg (₹)',
    tablePricePerPiece: 'Price/piece (₹)',
    tableAddon: 'Addon Chili',
    addIngredient: '+ Add Ingredient',
    pricingCodeRequired: 'Enter a code for the new ingredient.',
    pricingPriceRequired: 'Enter a price greater than 0.',
    makingChargePerKgLabel: 'Default Making Charge (₹/kg)',
    makingChargePerKgHint: 'Used when a recipe has no fixed making charge of its own.',
    masalaTypesRecipesTitle: 'Masala Types & Recipes',
    addMasalaType: '+ Add Masala Type',
    addRecipe: '+ Add Recipe',
    keyLabel: 'Key (unique, e.g. kolhapuri)',
    pricingTypeRequired: 'Enter a key and an English name.',
    fixedMakingChargeLabel: 'Fixed Making Charge',
    pricingUsesDefault: 'uses default',
    coreChili: 'Core Chili',
    ingredientsCountSuffix: 'ingredients',
    qtyLabelField: 'Qty label (e.g. 1.25)',
    addLine: '+ Add Line',
    pricingRecipeRequired: 'Pick a masala type and enter a quantity label.',
    pricingRecipeLinesRequired: 'Add at least one ingredient line with a quantity.',
    orderFrequencyLabel: 'Order Frequency',
    daysUnit: 'days',
    preferredChannelLabel: 'Preferred Channel',

    langToggleLabel: 'Language',

    masalaType_malvani: 'Malvani',
    masalaType_ghati: 'Ghati',

    locationLoginTitle: 'Shop Login',
    locationLoginHint: 'Log in once with this shop’s username and password.',
    shopUsername: 'Username',
    switchShop: 'Switch shop',
    startScreenHint: 'Ready to bill a customer?',
    generateNewBill: 'Generate New Bill',
    finalizingBill: 'Finalizing your bill…',

    readyMadeProductsTitle: 'Ready-made / Loose Products',
    scanBarcodeLabel: 'Scan Barcode',
    scanBarcodePlaceholder: 'Scan or type barcode, then Enter',
    searchProductLabel: 'Or search by name',
    searchProductPlaceholder: 'e.g. Chana Masala 500g',
    unknownBarcode: 'No product matches that barcode.',
    stockHereLabel: 'Stock at this shop',
    outOfStockWarning: '⚠ Stock shows 0 at this shop — you can still add it.',
    cartTotalLabel: 'Cart Total',

    productsManagerTitle: 'Products & Stock',
    productsTableTitle: 'Products',
    addProduct: '+ Add Product',
    productNameRequired: 'Enter a name for the new product.',
    readyMadeLabel: 'Ready-made',
    looseLabel: 'Loose',
    unitPiece: 'Piece',
    unitKg: 'Kg',
    unitGram: 'Gram',
    barcodeOptionalPlaceholder: 'Barcode (leave blank to auto-generate)',
    batchQtyLabel: 'Making how many?',
    batchQtyPlaceholder: 'e.g. 40',
    categoryLabel: 'Category',
    unitLabel: 'Unit',
    priceLabel: 'Price (₹)',
    barcodeLabel: 'Barcode',
    activeLabel: 'Active',
    printLabel: 'Print Label',
    stockGridTitle: 'Stock by Shop',
    noLocationsYetHint: 'Add a shop below before setting stock levels.',

    locationsManagerTitle: 'Shops',
    shopsTableTitle: 'Shop Logins',
    addShop: '+ Add Shop',
    shopNamePlaceholder: 'Shop name, e.g. Lalbaug',
    shopNameLabel: 'Shop Name',
    locationFieldsRequired: 'Enter a shop name, username, and password.',
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
    lalbaug: 'लालबाग',
    sewri: 'शिवडी',
    next: 'पुढे',
    fillAllFields: 'कृपया सर्व माहिती भरा',

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
    savingBill: 'जतन होत आहे...',

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
    billNoLabel: 'बिल क्र.',
    billNotesLabel: 'विशेष सूचना',
    billNotesPlaceholder: 'उदा. कमी तिखट, मीठ नको...',
    billNotesHint: 'शेअर केलेल्या बिलावर दिसेल. आपोआप अपडेट होते.',

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

    customerLookupTitle: 'ग्राहक शोध',
    analyticsTitle: 'व्यवसाय विश्लेषण',
    avgOrderValue: 'सरासरी ऑर्डर मूल्य',
    monthlyGrowth: 'वाढ (मासिक)',
    repeatCustomerRate: 'पुनरावृत्ती ग्राहक',
    monthlyTrendTitle: 'उत्पन्न कल',
    topItemsTitle: 'सर्वाधिक विक्री होणारे मसाले',
    channelBreakdownTitle: 'माध्यमानुसार उत्पन्न',
    topCustomersTitle: 'सर्वोत्तम ग्राहक',
    lastOrderLabel: 'शेवटची ऑर्डर',
    noAnalyticsData: 'या कालावधीत अजून कोणतीही ऑर्डर नाही.',

    tableArea: 'परिसर',
    tableOrders: 'ऑर्डर',
    tableTotalSpent: 'एकूण खर्च',
    totalSpent: 'एकूण खर्च',
    favoriteItem: 'आवडता पदार्थ',
    firstOrderLabel: 'पहिली ऑर्डर',
    backToCustomers: 'ग्राहकांकडे परत',
    noCustomersFound: 'अजून कोणताही जुळणारा ग्राहक नाही.',
    customersNavLink: 'ग्राहक शोध',

    cancel: 'रद्द करा',
    save: 'जतन करा',
    saved: 'जतन झाले',
    pricingManagerTitle: 'किंमत',
    ingredientRateCardTitle: 'साहित्य दर',
    tableCode: 'कोड',
    tableNameEn: 'नाव (इंग्रजी)',
    tableNameMr: 'नाव (मराठी)',
    tablePricePerKg: 'दर/किलो (₹)',
    tablePricePerPiece: 'दर/नग (₹)',
    tableAddon: 'अतिरिक्त मिरची',
    addIngredient: '+ साहित्य जोडा',
    pricingCodeRequired: 'नवीन साहित्यासाठी कोड टाका.',
    pricingPriceRequired: '0 पेक्षा जास्त किंमत टाका.',
    makingChargePerKgLabel: 'डिफॉल्ट बनावट खर्च (₹/किलो)',
    makingChargePerKgHint: 'रेसिपीचा स्वतःचा निश्चित बनावट खर्च नसेल तेव्हा वापरला जातो.',
    masalaTypesRecipesTitle: 'मसाल्याचे प्रकार आणि रेसिपी',
    addMasalaType: '+ मसाल्याचा प्रकार जोडा',
    addRecipe: '+ रेसिपी जोडा',
    keyLabel: 'की (अद्वितीय, उदा. kolhapuri)',
    pricingTypeRequired: 'की आणि इंग्रजी नाव टाका.',
    fixedMakingChargeLabel: 'निश्चित बनावट खर्च',
    pricingUsesDefault: 'डिफॉल्ट वापरला जातो',
    coreChili: 'मुख्य मिरची',
    ingredientsCountSuffix: 'साहित्य',
    qtyLabelField: 'प्रमाण लेबल (उदा. 1.25)',
    addLine: '+ ओळ जोडा',
    pricingRecipeRequired: 'मसाल्याचा प्रकार निवडा आणि प्रमाण लेबल टाका.',
    pricingRecipeLinesRequired: 'किमान एक साहित्य ओळ प्रमाणासह जोडा.',
    orderFrequencyLabel: 'ऑर्डर वारंवारता',
    daysUnit: 'दिवस',
    preferredChannelLabel: 'पसंतीचे माध्यम',

    langToggleLabel: 'भाषा',

    masalaType_malvani: 'मालवणी',
    masalaType_ghati: 'घाटी',

    locationLoginTitle: 'दुकान लॉगिन',
    locationLoginHint: 'या दुकानाचे युजरनेम आणि पासवर्ड वापरून एकदा लॉगिन करा.',
    shopUsername: 'युजरनेम',
    switchShop: 'दुकान बदला',
    startScreenHint: 'ग्राहकाचे बिल तयार करायचे आहे?',
    generateNewBill: 'नवीन बिल तयार करा',
    finalizingBill: 'तुमचे बिल अंतिम होत आहे...',

    readyMadeProductsTitle: 'रेडीमेड / सुटे पदार्थ',
    scanBarcodeLabel: 'बारकोड स्कॅन करा',
    scanBarcodePlaceholder: 'बारकोड स्कॅन करा किंवा टाका, नंतर Enter दाबा',
    searchProductLabel: 'किंवा नावाने शोधा',
    searchProductPlaceholder: 'उदा. चणा मसाला ५०० ग्रॅम',
    unknownBarcode: 'या बारकोडशी जुळणारा कोणताही पदार्थ नाही.',
    stockHereLabel: 'या दुकानातील स्टॉक',
    outOfStockWarning: '⚠ या दुकानात स्टॉक ० दाखवत आहे — तरीही जोडू शकता.',
    cartTotalLabel: 'कार्ट एकूण',

    productsManagerTitle: 'पदार्थ आणि स्टॉक',
    productsTableTitle: 'पदार्थ',
    addProduct: '+ पदार्थ जोडा',
    productNameRequired: 'नवीन पदार्थासाठी नाव टाका.',
    readyMadeLabel: 'रेडीमेड',
    looseLabel: 'सुटे',
    unitPiece: 'नग',
    unitKg: 'किलो',
    unitGram: 'ग्रॅम',
    barcodeOptionalPlaceholder: 'बारकोड (रिकामे ठेवल्यास आपोआप तयार होईल)',
    batchQtyLabel: 'किती तयार करत आहात?',
    batchQtyPlaceholder: 'उदा. ४०',
    categoryLabel: 'प्रकार',
    unitLabel: 'एकक',
    priceLabel: 'किंमत (₹)',
    barcodeLabel: 'बारकोड',
    activeLabel: 'सक्रिय',
    printLabel: 'लेबल प्रिंट करा',
    stockGridTitle: 'दुकानानुसार स्टॉक',
    noLocationsYetHint: 'स्टॉक सेट करण्यापूर्वी खाली एक दुकान जोडा.',

    locationsManagerTitle: 'दुकाने',
    shopsTableTitle: 'दुकान लॉगिन',
    addShop: '+ दुकान जोडा',
    shopNamePlaceholder: 'दुकानाचे नाव, उदा. लालबाग',
    shopNameLabel: 'दुकानाचे नाव',
    locationFieldsRequired: 'दुकानाचे नाव, युजरनेम आणि पासवर्ड टाका.',
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
// dbLabels/lang are optional -- only the live billing flow has a fresh
// pricingConfig.masala_types to check (needed for a type the admin just
// added, which has no entry in the STRINGS dict below). Historical/admin
// views that don't pass them just fall through to the static lookup.
export function masalaTypeLabel(t, type, dbLabels, lang) {
  const dbEntry = dbLabels?.[type];
  if (dbEntry) {
    const dbLabel = lang === 'mr' ? dbEntry.label_mr : dbEntry.label_en;
    if (dbLabel) return dbLabel;
  }
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

// Revenue/order "channel" buckets used by the analytics and customer-profile
// views: online, or offline split by store.
export function channelLabel(t, key) {
  if (key === 'online') return t('online');
  if (key === 'lalbaug' || key === 'sewri') return storeLabel(t, key);
  // Any other store name (a shop set up after the original two) is shown
  // as-is rather than collapsing to a generic "Offline" bucket.
  return key || t('offline');
}
