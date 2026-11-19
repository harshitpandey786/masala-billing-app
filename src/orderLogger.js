import { supabase } from './supabaseClient.js';
import { hasDetails } from './masalaDetails.js';

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
 *
 * `location` is the shop logged in on this device ({ id, name }, or null if
 * not configured yet) -- its name is written to the legacy `store` column so
 * existing channel-breakdown analytics keeps working, and its id to the new
 * `location_id` column for precise per-shop joins and stock tracking.
 */
export async function logOrderToSupabase(customer, bills, location) {
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
    payment_method: customer.paymentMethod ?? null,
    store: location?.name ?? null,
    location_id: location?.id ?? null,
    kind: bill.kind || 'custom',
    product_id: bill.productId ?? null,
    masala_type: bill.kind === 'product' ? null : bill.type,
    quantity_kg: bill.kind === 'product' ? null : bill.qtyLabel,
    ingredients_subtotal: bill.ingredientsSubtotal,
    making_charge: bill.makingCharge,
    total: bill.total,
    line_items: bill.lineItems.map((line) => ({
      code: line.code,
      qty: line.qty,
      unit: line.unit,
      amount: line.amount,
    })),
    // Only sent when there is something to save, so orders without step 2
    // details work even before the `details` column exists.
    ...(hasDetails(bill.details) ? { details: bill.details } : {}),
  }));

  const insert = (rows) =>
    withTimeout(supabase.from('bills').insert(rows).select('id, bill_no'), SUPABASE_TIMEOUT_MS);

  // Columns added after the original `bills` table -- if a migration for
  // one hasn't been run yet, strip just that column and retry rather than
  // losing the whole order over it. Checked in sequence so both can be
  // missing at once (e.g. a fresh install that's only run some of
  // docs/supabase-setup.md) without needing a retry per combination.
  const OPTIONAL_COLUMNS = [
    ['details', 'docs/supabase-setup.md §11'],
    ['payment_method', 'docs/supabase-setup.md §13'],
  ];

  try {
    let rows = billRows;
    let { data, error } = await insert(rows);
    for (const [column, doc] of OPTIONAL_COLUMNS) {
      if (error && new RegExp(column).test(error.message || '') && rows.some((row) => column in row)) {
        console.error(`Bill ${column} not saved -- add the \`${column}\` column (${doc})`, error);
        rows = rows.map((row) => {
          const { [column]: _omit, ...rest } = row;
          return rest;
        });
        ({ data, error } = await insert(rows));
      }
    }
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

/**
 * Flips the UPI QR's "Mark as paid" button (see ShareOutput.jsx / §14) --
 * there's no payment gateway here to confirm this automatically, so it's
 * the operator's own confirmation (seeing the payment land in their UPI
 * app) being recorded. Best-effort, same resilience rule as everything else
 * here: a failure (including the `paid` column not existing yet) just means
 * the tick doesn't stick, never that the bill itself is at risk.
 */
export async function markBillsPaid(billIds) {
  if (!supabase || billIds.length === 0) return { error: null };
  try {
    const { error } = await supabase.from('bills').update({ paid: true }).in('id', billIds);
    if (error) console.error('Failed to mark bill paid in Supabase', error);
    return { error };
  } catch (err) {
    console.error('Failed to mark bill paid in Supabase', err);
    return { error: err };
  }
}
