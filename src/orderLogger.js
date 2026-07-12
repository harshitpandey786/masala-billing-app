import { supabase } from './supabaseClient.js';

/**
 * Fire-and-forget log of a completed order to Supabase -- one row per bill in
 * `bills`, plus one row per ingredient line item in `bill_line_items`, for the
 * client's marketing/campaign use. Never blocks or throws into the UI -- if
 * Supabase isn't configured or the insert fails, this just logs to the console.
 */
export async function logOrderToSupabase(customer, bills) {
  if (!supabase) {
    console.warn('Supabase is not configured -- skipping order logging.');
    return;
  }

  // IDs are generated client-side (rather than left to the DB default) so the
  // line items can reference their parent bill in the same round trip, without
  // needing to read the row back -- the anon key only has insert privileges.
  const billIds = bills.map(() => crypto.randomUUID());

  const billRows = bills.map((bill, i) => ({
    id: billIds[i],
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
  }));

  const lineItemRows = bills.flatMap((bill, i) =>
    bill.lineItems.map((line, lineOrder) => ({
      bill_id: billIds[i],
      code: line.code,
      qty: line.qty,
      unit: line.unit,
      amount: line.amount,
      line_order: lineOrder,
    }))
  );

  const { error: billsError } = await supabase.from('bills').insert(billRows);
  if (billsError) {
    console.error('Failed to log bills to Supabase', billsError);
    return;
  }

  const { error: lineItemsError } = await supabase.from('bill_line_items').insert(lineItemRows);
  if (lineItemsError) {
    console.error('Failed to log bill line items to Supabase', lineItemsError);
  }
}
