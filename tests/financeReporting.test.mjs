import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { summarizeFinance, validateFinanceEntry } from '../src/utils/financeReporting.js'

const date = '2026-09-17'
const entry = { type: 'income', category: ' Catering ', description: ' Reference ', amount: '100.25', date }
const sale = { id: 'sale', created_at: '2026-09-17T06:00:00Z', sale_status: 'completed', total: '950', sale_items: [] }

test('finance validates and trims manual entries', () => {
  assert.deepEqual(validateFinanceEntry(entry), { category: 'Catering', description: 'Reference', amount: 100.25, date })
  for (const amount of ['', '0', '-1', '1.001', 'Infinity', 'NaN', '1e3', '10000000000']) {
    assert.throws(() => validateFinanceEntry({ ...entry, amount }))
  }
  for (const change of [{ type: 'sale' }, { category: '' }, { category: 'a'.repeat(101) }, { date: '2026-02-30' }]) {
    assert.throws(() => validateFinanceEntry({ ...entry, ...change }))
  }
})

test('finance combines completed POS sales and manual income without counting cancelled sales', () => {
  const report = summarizeFinance([sale, { ...sale, id: 'cancelled', sale_status: 'cancelled' }],
    [{ id: 'income', income_date: date, amount: '100.25' }],
    [{ id: 'expense', expense_date: date, amount: '50.15' }], date, date)
  assert.equal(report.sales, 950)
  assert.equal(report.otherIncome, 100.25)
  assert.equal(report.totalIncome, 1050.25)
  assert.equal(report.expenses, 50.15)
  assert.equal(report.balance, 1000.10)
  assert.equal(report.entries.length, 2)
  assert.deepEqual(report.daily, [{ date, sales: 950, income: 100.25, expenses: 50.15, totalIncome: 1050.25 }])
})

test('finance filters manual dates and includes empty chart days', () => {
  const report = summarizeFinance([], [{ income_date: '2026-09-16', amount: 999 }],
    [{ expense_date: date, amount: '0.10' }, { expense_date: date, amount: '0.20' }], date, '2026-09-18')
  assert.equal(report.totalIncome, 0)
  assert.equal(report.balance, -0.3)
  assert.equal(report.daily.length, 2)
  assert.equal(report.daily[1].expenses, 0)
  assert.equal(report.entries.length, 2)
})

test('finance is reachable from routing and navigation', async () => {
  for (const file of ['components/layout/Sidebar.jsx', 'utils/constants.js', 'routes/AppRoutes.jsx']) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')
    assert.match(source, /\/finance/)
  }
})
