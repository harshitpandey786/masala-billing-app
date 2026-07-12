import { supabase } from './supabaseClient.js';

/**
 * Fire-and-forget log of a completed order to Supabase -- one row per bill in
 * `bills`, with its full ingredient breakdown nested as JSON in `line_items`,
 * for the client's marketing/campaign use. Never blocks or throws into the
 * UI -- if Supabase isn't configured or the insert fails, this just logs to
 * the console.
 */
export async function logOrderToSupabase(customer, bills) {
  if (!supabase) {
    console.warn('Supabase is not configured -- skipping order logging.');
    return;
  }

  const billRows = bills.map((bill) => ({
    order_date: customer.date,
    customer_name: customer.name,
    phone: customer.phone,
    area: customer.area,
    poc_name: customer.pocName,
    billing_mode: customer.billingMode,
    store: customer.store,
    masala_type: bill.type,
    quantity_kg: bill.qtyLabel,
    ingredients_subtotal: bill.ingredientsSubtotal,
    making_charge: bill.makingCharge,
    total: bill.total,
    line_items: bill.lineItems.map((line) => ({
      code: line.code,
      qty: line.qty,
      unit: line.unit,
      amount: line.amount,
    })),
  }));

  const { error } = await supabase.from('bills').insert(billRows);
  if (error) {
    console.error('Failed to log order to Supabase', error);
  }
}
