// Reporting uses the restaurant's Sri Lankan business day, not UTC/browser time.
export const SALES_TIMEZONE = 'Asia/Colombo'
const DAY = 86400000
export const businessDay = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALES_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const get = type => parts.find(p => p.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export const shiftDay = (day, offset) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY).toISOString().slice(0, 10)
export const dayBounds = (start, end) => {
  const valid = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && shiftDay(day, 0) === day
  if (!valid(start) || !valid(end) || start > end) throw new Error('Choose a valid start and end date.')
  if ((Date.parse(end) - Date.parse(start)) / DAY > 365) throw new Error('Select a date range of no more than 366 days.')
  return {
    from: new Date(`${start}T00:00:00+05:30`).toISOString(),
    to: new Date(`${shiftDay(end, 1)}T00:00:00+05:30`).toISOString(),
  }
}
const money = value => Math.round(value * 100) / 100
const number = value => Number(value) || 0
export const summarizeSales = (sales, start, end) => {
  dayBounds(start, end)
  const daily = []
  for (let date = start; date <= end; date = shiftDay(date, 1)) {
    daily.push({ date, revenue: 0, cost: 0, profit: 0, orders: 0 })
  }
  const byDay = Object.fromEntries(daily.map(d => [d.date, d]))
  const payments = {}
  const products = {}
  const orders = sales.filter(s => s.sale_status === 'completed' && byDay[businessDay(s.created_at)])
  let discount = 0
  for (const sale of orders) {
    const day = byDay[businessDay(sale.created_at)]
    const cost = (sale.sale_items || []).reduce((sum, item) => sum + number(item.total_cost), 0)
    day.revenue += number(sale.total)
    day.cost += cost
    // Taxes collected are not restaurant profit. This is gross profit, before expenses.
    day.profit += number(sale.total) - number(sale.tax) - cost
    day.orders++
    discount += number(sale.discount)
    payments[sale.payment_method] = (payments[sale.payment_method] || 0) + number(sale.total)
    for (const item of sale.sale_items || []) {
      const id = item.product_id
      products[id] ||= { id, name: item.products?.name || 'Unavailable product', quantity: 0 }
      products[id].quantity += number(item.quantity)
    }
  }
  for (const day of daily) for (const key of ['revenue', 'cost', 'profit']) day[key] = money(day[key])
  return {
    orders: [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)), daily,
    total: money(daily.reduce((sum, d) => sum + d.revenue, 0)),
    cost: money(daily.reduce((sum, d) => sum + d.cost, 0)),
    profit: money(daily.reduce((sum, d) => sum + d.profit, 0)), discount: money(discount),
    count: orders.length,
    payments: Object.entries(payments).map(([name, value]) => ({ name: name.replaceAll('_', ' '), value: money(value) })),
    topProducts: Object.values(products).sort((a, b) => b.quantity - a.quantity).slice(0, 7),
  }
}

// A transparent baseline, not an AI prediction: average daily revenue over up to
// 28 completed days since the first observed sale. Zero-sales days are included.
export const forecastSales = (sales, end) => {
  const start = shiftDay(end, -27)
  const history = summarizeSales(sales, start, end)
  const first = history.daily.find(d => d.orders > 0)?.date
  const observed = first ? history.daily.filter(d => d.date >= first) : []
  if (observed.length < 7) return { points: [], total: null, days: observed.length }
  const average = money(observed.reduce((sum, d) => sum + d.revenue, 0) / observed.length)
  const points = Array.from({ length: 7 }, (_, i) => ({ date: shiftDay(end, i + 1), forecast: average }))
  return { points, total: money(average * 7), days: observed.length }
}
