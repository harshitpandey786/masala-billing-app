import { supabase } from './supabaseClient.js';

const RESULT_LIMIT = 500;

// One row per customer (grouped by phone), derived from the bills table --
// shared by the admin/front-of-house customer list (CustomerList.jsx) and the
// phone-number autocomplete on the billing flow's customer step
// (CustomerDetails.jsx). Kept here once instead of duplicated in both.
export function groupBillsByCustomer(rows) {
  const byPhone = new Map();
  for (const row of rows) {
    if (!row.phone) continue;
    const entry = byPhone.get(row.phone) || {
      phone: row.phone,
      name: row.customer_name,
      area: row.area,
      pocName: row.poc_name,
      totalBills: 0,
      totalSpent: 0,
      lastOrderDate: row.order_date,
    };
    entry.totalBills += 1;
    entry.totalSpent += Number(row.total) || 0;
    entry.name = row.customer_name || entry.name;
    entry.area = entry.area || row.area;
    if (!entry.lastOrderDate || row.order_date > entry.lastOrderDate) {
      entry.lastOrderDate = row.order_date;
      entry.pocName = row.poc_name || entry.pocName;
    }
    byPhone.set(row.phone, entry);
  }
  return [...byPhone.values()].sort((a, b) => (a.lastOrderDate < b.lastOrderDate ? 1 : -1));
}

/**
 * Searches past customers by name/phone for the autocomplete on the customer
 * step. Returns [] if Supabase isn't configured or the search fails -- never
 * blocks billing, same resilience rule as the rest of the app.
 */
export async function searchCustomers(term, limit = 8) {
  if (!supabase || !term.trim()) return [];
  try {
    const escaped = term.trim().replace(/[%,]/g, '');
    const { data, error } = await supabase
      .from('bills')
      .select('customer_name, phone, area, poc_name, order_date, total')
      .or(`customer_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
      .order('created_at', { ascending: false })
      .limit(RESULT_LIMIT);
    if (error || !data) return [];
    return groupBillsByCustomer(data).slice(0, limit);
  } catch {
    return [];
  }
}
