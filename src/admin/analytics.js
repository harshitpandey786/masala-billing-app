// Pure aggregation over a list of `bills` rows (same shape as the Supabase
// `bills` table / DEMO_ROWS) into the figures a small offline FMCG masala
// business actually wants to see: revenue, growth, best sellers, channel
// split, repeat customers. No I/O here -- AdminAnalytics.jsx fetches the
// rows and this just crunches them, so it's cheap to unit test directly.

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

function monthKey(orderDate) {
  return (orderDate || '').slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(year, month - 1, 1));
}

export function computeAnalytics(rows) {
  const totalBills = rows.length;
  const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const avgOrderValue = totalBills ? totalRevenue / totalBills : 0;

  // ---- monthly trend + month-over-month growth ----
  const monthBuckets = new Map();
  for (const row of rows) {
    const key = monthKey(row.order_date);
    if (!key) continue;
    const bucket = monthBuckets.get(key) || { month: key, revenue: 0, bills: 0 };
    bucket.revenue += Number(row.total) || 0;
    bucket.bills += 1;
    monthBuckets.set(key, bucket);
  }
  const monthlyTrend = [...monthBuckets.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((bucket) => ({ ...bucket, label: monthLabel(bucket.month) }));

  let growthPct = null;
  if (monthlyTrend.length >= 2) {
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const latest = monthlyTrend[monthlyTrend.length - 1];
    growthPct = prev.revenue > 0 ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : null;
  }

  // ---- best-selling masala types ----
  const itemBuckets = new Map();
  for (const row of rows) {
    const type = (row.masala_type || 'unknown').toLowerCase();
    const bucket = itemBuckets.get(type) || { type, revenue: 0, qtyKg: 0, bills: 0 };
    bucket.revenue += Number(row.total) || 0;
    bucket.qtyKg += Number.parseFloat(row.quantity_kg) || 0;
    bucket.bills += 1;
    itemBuckets.set(type, bucket);
  }
  const topItems = [...itemBuckets.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((item) => ({ ...item, sharePct: totalRevenue ? (item.revenue / totalRevenue) * 100 : 0 }));

  // ---- revenue by channel: online, or offline split by store ----
  const channelBuckets = new Map();
  for (const row of rows) {
    const key = row.billing_mode === 'offline' ? row.store || 'offline-other' : 'online';
    const bucket = channelBuckets.get(key) || { key, revenue: 0, bills: 0 };
    bucket.revenue += Number(row.total) || 0;
    bucket.bills += 1;
    channelBuckets.set(key, bucket);
  }
  const channelBreakdown = [...channelBuckets.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({ ...c, sharePct: totalRevenue ? (c.revenue / totalRevenue) * 100 : 0 }));

  // ---- revenue by shop (location_id), independent of the online/offline
  // channel split above -- this is what each shop actually sold, online
  // orders included, for the owner's shop-wise performance view.
  const shopBuckets = new Map();
  for (const row of rows) {
    const key = row.location_id || 'unknown';
    const bucket = shopBuckets.get(key) || { locationId: key, revenue: 0, bills: 0 };
    bucket.revenue += Number(row.total) || 0;
    bucket.bills += 1;
    shopBuckets.set(key, bucket);
  }
  const shopBreakdown = [...shopBuckets.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((s) => ({ ...s, sharePct: totalRevenue ? (s.revenue / totalRevenue) * 100 : 0 }));

  // ---- customers: totals, repeat rate, top spenders ----
  const customerBuckets = new Map();
  for (const row of rows) {
    if (!row.phone) continue;
    const bucket = customerBuckets.get(row.phone) || {
      phone: row.phone,
      name: row.customer_name,
      revenue: 0,
      bills: 0,
      lastOrderDate: row.order_date,
    };
    bucket.revenue += Number(row.total) || 0;
    bucket.bills += 1;
    bucket.name = row.customer_name || bucket.name;
    if (!bucket.lastOrderDate || row.order_date > bucket.lastOrderDate) {
      bucket.lastOrderDate = row.order_date;
    }
    customerBuckets.set(row.phone, bucket);
  }
  const customers = [...customerBuckets.values()];
  const uniqueCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.bills > 1).length;
  const repeatRatePct = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;
  const topCustomers = [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    totalRevenue,
    totalBills,
    avgOrderValue,
    uniqueCustomers,
    repeatCustomers,
    repeatRatePct,
    monthlyTrend,
    growthPct,
    topItems,
    channelBreakdown,
    shopBreakdown,
    topCustomers,
  };
}
