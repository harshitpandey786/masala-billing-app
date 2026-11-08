import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics } from './analytics.js';

function bill(overrides) {
  return {
    order_date: '2026-11-01',
    customer_name: 'Test Customer',
    phone: '9000000000',
    billing_mode: 'online',
    store: null,
    masala_type: 'malvani',
    quantity_kg: '1.25',
    total: 1000,
    ...overrides,
  };
}

test('empty input returns zeroed-out analytics, no divide-by-zero', () => {
  const result = computeAnalytics([]);
  assert.equal(result.totalBills, 0);
  assert.equal(result.totalRevenue, 0);
  assert.equal(result.avgOrderValue, 0);
  assert.equal(result.uniqueCustomers, 0);
  assert.equal(result.repeatRatePct, 0);
  assert.equal(result.growthPct, null);
  assert.deepEqual(result.topItems, []);
  assert.deepEqual(result.monthlyTrend, []);
});

test('totals and average order value', () => {
  const result = computeAnalytics([bill({ total: 1000 }), bill({ total: 500, phone: '9111111111' })]);
  assert.equal(result.totalBills, 2);
  assert.equal(result.totalRevenue, 1500);
  assert.equal(result.avgOrderValue, 750);
});

test('month-over-month growth compares the last two months in range', () => {
  const rows = [
    bill({ order_date: '2026-09-15', total: 1000 }),
    bill({ order_date: '2026-10-15', total: 1500 }),
  ];
  const result = computeAnalytics(rows);
  assert.equal(result.monthlyTrend.length, 2);
  assert.equal(result.growthPct, 50); // (1500-1000)/1000 * 100
});

test('growth is null when the previous month had zero revenue', () => {
  const rows = [bill({ order_date: '2026-10-15', total: 0 }), bill({ order_date: '2026-11-15', total: 500 })];
  const result = computeAnalytics(rows);
  assert.equal(result.growthPct, null);
});

test('single month of data has no growth figure', () => {
  const result = computeAnalytics([bill({ order_date: '2026-11-01' }), bill({ order_date: '2026-11-15' })]);
  assert.equal(result.growthPct, null);
  assert.equal(result.monthlyTrend.length, 1);
});

test('best-selling masala type is ranked by revenue, with qty and share', () => {
  const rows = [
    bill({ masala_type: 'malvani', total: 3000, quantity_kg: '3' }),
    bill({ masala_type: 'ghati', total: 1000, quantity_kg: '1.25', phone: '9222222222' }),
  ];
  const result = computeAnalytics(rows);
  assert.equal(result.topItems[0].type, 'malvani');
  assert.equal(result.topItems[0].qtyKg, 3);
  assert.equal(result.topItems[0].sharePct, 75);
  assert.equal(result.topItems[1].type, 'ghati');
  assert.equal(result.topItems[1].sharePct, 25);
});

test('channel breakdown splits offline by store and groups online separately', () => {
  const rows = [
    bill({ billing_mode: 'online', store: null, total: 1000 }),
    bill({ billing_mode: 'offline', store: 'lalbaug', total: 2000, phone: '9333333333' }),
    bill({ billing_mode: 'offline', store: 'sewri', total: 500, phone: '9444444444' }),
  ];
  const result = computeAnalytics(rows);
  const byKey = Object.fromEntries(result.channelBreakdown.map((c) => [c.key, c]));
  assert.equal(byKey.online.revenue, 1000);
  assert.equal(byKey.lalbaug.revenue, 2000);
  assert.equal(byKey.sewri.revenue, 500);
});

test('repeat customer rate counts phones with more than one bill', () => {
  const rows = [
    bill({ phone: '9000000000', order_date: '2026-11-01' }),
    bill({ phone: '9000000000', order_date: '2026-11-05' }),
    bill({ phone: '9111111111', order_date: '2026-11-02' }),
  ];
  const result = computeAnalytics(rows);
  assert.equal(result.uniqueCustomers, 2);
  assert.equal(result.repeatCustomers, 1);
  assert.equal(result.repeatRatePct, 50);
});

test('top customers are ranked by total spend, capped at 5', () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    bill({ phone: `900000000${i}`, total: (i + 1) * 100, order_date: '2026-11-01' })
  );
  const result = computeAnalytics(rows);
  assert.equal(result.topCustomers.length, 5);
  assert.equal(result.topCustomers[0].revenue, 700);
  assert.equal(result.topCustomers[4].revenue, 300);
});

test('a customer\'s lastOrderDate tracks the most recent bill, not the last row seen', () => {
  const rows = [
    bill({ phone: '9000000000', order_date: '2026-11-10' }),
    bill({ phone: '9000000000', order_date: '2026-09-01' }),
  ];
  const result = computeAnalytics(rows);
  assert.equal(result.topCustomers[0].lastOrderDate, '2026-11-10');
});
