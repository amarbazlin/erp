import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { businessDay, dayBounds, shiftDay, summarizeSales, forecastSales } from '../src/utils/salesReporting.js'

const sale = (overrides = {}) => ({
  id: 'one', created_at: '2026-09-17T06:00:00Z', sale_status: 'completed',
  total: '950', tax: '50', discount: '100', payment_method: 'cash',
  sale_items: [{ product_id: 'cup', quantity: 2, total_cost: '300', products: { name: 'Cup' } }],
  ...overrides,
})

test('Sri Lankan day boundaries use an exclusive next-day limit', () => {
  assert.equal(businessDay('2026-09-16T18:29:59Z'), '2026-09-16')
  assert.equal(businessDay('2026-09-16T18:30:00Z'), '2026-09-17')
  assert.deepEqual(dayBounds('2026-09-17', '2026-09-17'), {
    from: '2026-09-16T18:30:00.000Z', to: '2026-09-17T18:30:00.000Z',
  })
})

test('invalid, reversed and excessive date ranges are rejected', () => {
  for (const range of [['2026-02-30', '2026-03-01'], ['', '2026-09-17'], ['2026-09-18', '2026-09-17'], ['2025-01-01', '2026-09-17']]) {
    assert.throws(() => dayBounds(...range))
  }
})

test('single-day totals include only completed orders within the local day', () => {
  const report = summarizeSales([
    sale(), sale({ id: 'cancelled', sale_status: 'cancelled' }),
    sale({ id: 'previous', created_at: '2026-09-16T18:29:59Z' }),
    sale({ id: 'next', created_at: '2026-09-17T18:30:00Z' }),
  ], '2026-09-17', '2026-09-17')
  assert.equal(report.count, 1)
  assert.equal(report.total, 950)
  assert.equal(report.cost, 300)
  assert.equal(report.profit, 600)
  assert.equal(report.discount, 100)
  assert.deepEqual(report.payments, [{ name: 'cash', value: 950 }])
  assert.equal(report.topProducts[0].quantity, 2)
})

test('chart series includes zero-sales days and empty periods', () => {
  const report = summarizeSales([sale()], '2026-09-16', '2026-09-18')
  assert.deepEqual(report.daily.map(d => d.revenue), [0, 950, 0])
  assert.equal(summarizeSales([], '2026-09-17', '2026-09-17').total, 0)
})

test('forecast requires seven days and includes zero-sales days', () => {
  assert.equal(forecastSales([], '2026-09-17').total, null)
  assert.equal(forecastSales([sale()], '2026-09-17').total, null)
  const forecast = forecastSales([sale({ created_at: '2026-09-11T06:00:00Z', total: 700 })], '2026-09-17')
  assert.equal(forecast.days, 7)
  assert.equal(forecast.total, 700)
  assert.equal(forecast.points.length, 7)
  assert.equal(forecast.points[0].date, '2026-09-18')
  assert.equal(forecast.points[6].date, shiftDay('2026-09-17', 7))
})

test('Dashboard and Analytics use shared reporting without legacy service calls', async () => {
  for (const page of ['dashboard/Dashboard', 'analytics/Analytics']) {
    const source = await readFile(new URL(`../src/pages/${page}.jsx`, import.meta.url), 'utf8')
    assert.match(source, /<SalesReport\s*\/>/)
    assert.match(source, /<InventoryOverview\s*\/>/)
    assert.doesNotMatch(source, /analyticsService|salesService/)
  }
})
