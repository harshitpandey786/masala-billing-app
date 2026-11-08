import { supabase } from './supabaseClient.js';

// Supabase calls never block or throw into the UI -- if it isn't configured,
// the insert fails, or it's just slow, billing itself still works and we log
// to the console instead. This timeout guards the one await in the flow
// (logOrderToSupabase, which the operator waits on before reaching Share) so
// a flaky connection can't leave them stuck on the confirm button.
const SUPABASE_TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: new Error('timed out') }), ms)),
  ]);
}

/**
 * Logs a completed order to Supabase -- one row per bill in `bills`, with its
 * full ingredient breakdown nested as JSON in `line_items`. Returns the
 * inserted rows' id/bill_no in the same order as `bills`, or null entries if
 * logging wasn't possible (not configured, failed, or timed out) -- the bill
 * number is then just not shown rather than blocking anything.
 */
export async function logOrderToSupabase(customer, bills) {
  if (!supabase) {
    console.warn('Supabase is not configured -- skipping order logging.');
    return bills.map(() => null);
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

  try {
    const { data, error } = await withTimeout(
      supabase.from('bills').insert(billRows).select('id, bill_no'),
      SUPABASE_TIMEOUT_MS
    );
    if (error || !data) {
      console.error('Failed to log order to Supabase', error);
      return bills.map(() => null);
    }
    return data.map((row) => ({ id: row.id, billNo: row.bill_no }));
  } catch (err) {
    console.error('Failed to log order to Supabase', err);
    return bills.map(() => null);
  }
}

/**
 * Best-effort update of the shop's notes ("less chilli", etc.) on already
 * logged bill rows -- fire-and-forget, same resilience rules as above. Every
 * row from one order gets the same notes, same as the customer fields that
 * are already duplicated per bill row in this one-row-per-bill schema.
 */
export async function updateBillNotes(billIds, notes) {
  if (!supabase || billIds.length === 0) return;
  try {
    const { error } = await supabase.from('bills').update({ notes }).in('id', billIds);
    if (error) {
      console.error('Failed to save bill notes to Supabase', error);
    }
  } catch (err) {
    console.error('Failed to save bill notes to Supabase', err);
  }
}
