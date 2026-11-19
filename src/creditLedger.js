import { supabase } from './supabaseClient.js';

// Khata (credit book): a customer buys now, pays later, in full or in
// instalments. Every entry is a 'charge' (they now owe more) or a 'payment'
// (they paid some of it back); the balance is just the running sum. Scoped
// to `phone`, not to one shop -- customers are shared across shops (see
// docs/supabase-setup.md §9), so any shop can see and add to the same
// running balance. See §12b for the table this reads/writes.

export function ledgerBalance(entries) {
  return entries.reduce((sum, e) => sum + (e.entry_type === 'payment' ? -Number(e.amount) : Number(e.amount)), 0);
}

export async function fetchLedgerEntries(phone) {
  if (!supabase || !phone) return [];
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('*')
    .eq('phone', phone)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch khata ledger', error);
    return [];
  }
  return data || [];
}

export async function addLedgerEntry({ phone, customerName, locationId, entryType, amount, note }) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.from('credit_ledger').insert({
    phone,
    customer_name: customerName,
    location_id: locationId || null,
    entry_type: entryType,
    amount: Number(amount),
    note: note || null,
  });
  if (error) console.error('Failed to save khata entry', error);
  return { error };
}

/**
 * One row per customer with a non-zero balance, across every shop -- for the
 * owner's "who owes money" view. Pulls every ledger row (khata customers are
 * a small slice of the full customer base) and nets it client-side rather
 * than needing a database view just for this.
 */
export async function fetchAllBalances() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('credit_ledger').select('phone, customer_name, entry_type, amount');
  if (error) {
    console.error('Failed to fetch khata balances', error);
    return [];
  }
  const byPhone = new Map();
  for (const row of data || []) {
    const bucket = byPhone.get(row.phone) || { phone: row.phone, name: row.customer_name, balance: 0 };
    bucket.balance += row.entry_type === 'payment' ? -Number(row.amount) : Number(row.amount);
    bucket.name = row.customer_name || bucket.name;
    byPhone.set(row.phone, bucket);
  }
  return [...byPhone.values()].filter((b) => Math.round(b.balance) !== 0).sort((a, b) => b.balance - a.balance);
}
