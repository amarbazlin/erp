import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { formatCurrency, formatChartCurrency } from '../src/utils/formatters.js'

 test('chart currency ignores Recharts series-name and payload arguments', () => {
  for (const name of ['Sales', 'Recorded ingredient cost', 'Estimated sales']) {
    for (const value of [0, 950, 1234.56, null, undefined]) {
      assert.equal(formatChartCurrency(value, name, {}, 0, []), formatCurrency(value))
    }
  }
  assert.match(formatCurrency(100, 'USD'), /100/)
})

test('both reporting tooltip instances use the chart-safe formatter', async () => {
  const source = await readFile(new URL('../src/components/shared/SalesReport.jsx', import.meta.url), 'utf8')
  assert.equal((source.match(/formatter=\{formatChartCurrency\}/g) || []).length, 2)
  assert.doesNotMatch(source, /formatter=\{formatCurrency\}/)
})
