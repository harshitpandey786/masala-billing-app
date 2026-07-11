const WEBHOOK_URL = import.meta.env.VITE_SHEETS_WEBHOOK_URL;

/**
 * Fire-and-forget log of a completed order's bills to Google Sheets, for the
 * client's marketing/campaign use. Never blocks or throws into the UI -- if the
 * webhook isn't configured or the request fails, this just logs to the console.
 */
export async function logOrderToSheet(customer, bills) {
  if (!WEBHOOK_URL) {
    console.warn('VITE_SHEETS_WEBHOOK_URL is not set -- skipping Google Sheets logging.');
    return;
  }

  const timestamp = new Date().toISOString();
  const rows = bills.map((bill) => ({
    timestamp,
    date: customer.date,
    customerName: customer.name,
    phone: customer.phone,
    area: customer.area,
    pocName: customer.pocName,
    billingMode: customer.billingMode,
    store: customer.store,
    masalaType: bill.type,
    quantityKg: bill.qtyLabel,
    ingredientsSubtotal: bill.ingredientsSubtotal,
    makingCharge: bill.makingCharge,
    total: bill.total,
  }));

  try {
    // Apps Script Web Apps don't return proper CORS headers for readable responses,
    // so this is sent as a no-cors fire-and-forget beacon -- we can't read the result,
    // only confirm the request went out.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ rows }),
    });
  } catch (err) {
    console.error('Failed to log order to Google Sheets', err);
  }
}
