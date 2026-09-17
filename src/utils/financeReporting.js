import { businessDay, dayBounds, shiftDay, summarizeSales } from './salesReporting.js'

export const validateFinanceEntry = ({ type, category, description = '', amount, date }) => {
  if (!['income', 'expense'].includes(type)) throw new Error('Choose income or expense.')
  dayBounds(date, date)
  const label = String(category || '').trim()
  if (!label || label.length > 100) throw new Error('Enter a label of 1–100 characters.')
  const text = String(amount).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0 || Number(text) > 9999999999.99) {
    throw new Error('Enter a positive amount with at most two decimal places.')
  }
  return { category: label, description: String(description).trim(), amount: Number(text), date }
}

export const summarizeFinance = (sales, income, expenses, start, end) => {
  const salesReport = summarizeSales(sales, start, end)
  const daily = salesReport.daily.map(d => ({ date: d.date, sales: d.revenue, income: 0, expenses: 0 }))
  const byDay = Object.fromEntries(daily.map(d => [d.date, d]))
  const entries = []
  for (const [rows, type, field, key] of [[income, 'income', 'income_date', 'income'], [expenses, 'expense', 'expense_date', 'expenses']]) {
    for (const row of rows) {
      if (!byDay[row[field]]) continue
      byDay[row[field]][key] += Math.round(Number(row.amount) * 100)
      entries.push({ ...row, type, date: row[field] })
    }
  }
  const cents = value => Math.round(value * 100)
  for (const d of daily) {
    d.income /= 100
    d.expenses /= 100
    d.totalIncome = (cents(d.sales) + cents(d.income)) / 100
  }
  const sum = key => daily.reduce((n, d) => n + cents(d[key]), 0) / 100
  const totalIncome = sum('totalIncome')
  const totalExpenses = sum('expenses')
  return { daily, entries: entries.sort((a, b) => b.date.localeCompare(a.date)), sales: salesReport.total,
    otherIncome: sum('income'), totalIncome, expenses: totalExpenses,
    balance: (cents(totalIncome) - cents(totalExpenses)) / 100 }
}

export const financeDefaultRange = () => {
  const end = businessDay()
  return { start: shiftDay(end, -29), end }
}
