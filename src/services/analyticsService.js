import { supabase } from './supabase'
import { dayBounds, summarizeSales, forecastSales, businessDay, shiftDay } from '../utils/salesReporting'

// Page through every matching sale: Supabase's default row cap must not truncate totals.
export const loadSalesRange = async (start, end) => {
  const { from, to } = dayBounds(start, end)
  const rows = []
  for (let offset = 0; ; ) {
    const { data, error } = await supabase.from('sales')
      .select(`id, invoice_number, created_at, sale_status, subtotal, discount, tax, total,
        payment_method, customers(full_name, phone), users(full_name),
        sale_items(product_id, quantity, unit_price, total_price, total_cost, products(name))`)
      .eq('sale_status', 'completed').gte('created_at', from).lt('created_at', to)
      .order('created_at').order('id').range(offset, offset + 499)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    offset += data.length
  }
  return rows
}



export const analyticsService = {
  getInventoryOverview: async () => {
    const items = []
    for (let offset = 0; ; ) {
      const { data, error } = await supabase.from('inventory_items')
        .select('id, name, sku, current_quantity, low_stock_threshold')
        .eq('is_active', true).order('id').range(offset, offset + 499)
      if (error) throw error
      if (!data?.length) break
      items.push(...data)
      offset += data.length
    }
    const empty = items.filter(i => Number(i.current_quantity) <= 0)
    const lowStock = items.filter(i => Number(i.current_quantity) <= Number(i.low_stock_threshold))
    return {
      total: items.length, lowStock,
      health: [
        { name: 'Healthy', value: items.length - lowStock.length, color: '#22c55e' },
        { name: 'Low stock', value: lowStock.length - empty.length, color: '#f97316' },
        { name: 'Out of stock', value: empty.length, color: '#ef4444' },
      ],
    }
  },
  getSalesReport: async (start, end) => {
    const today = businessDay()
    const historyEnd = shiftDay(today, -1)
    const historyStart = shiftDay(historyEnd, -27)
    const [sales, history] = await Promise.all([
      loadSalesRange(start, end), loadSalesRange(historyStart, historyEnd),
    ])
    return { ...summarizeSales(sales, start, end), forecast: forecastSales(history, historyEnd) }
  },
  // Sales by payment method for a date range
  getPaymentBreakdown: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const { data, error } = await supabase
      .from('sales')
      .select('payment_method, total')
      .eq('sale_status', 'completed')
      .gte('created_at', from.toISOString())
    if (error) throw error
    const grouped = {}
    for (const s of data || []) {
      grouped[s.payment_method] = (grouped[s.payment_method] || 0) + parseFloat(s.total)
    }
    const colors = { cash: '#22c55e', card: '#3b82f6', bank_transfer: '#f97316', online: '#a855f7' }
    return Object.entries(grouped).map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }))
  },

  // Category revenue breakdown (top products grouped by product category)
  getCategoryBreakdown: async () => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('total_price, products ( id, name, product_categories ( name ) )')
      .limit(2000)
    if (error) throw error
    const grouped = {}
    for (const item of data || []) {
      const cat = item.products?.product_categories?.name || 'Uncategorised'
      grouped[cat] = (grouped[cat] || 0) + parseFloat(item.total_price)
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  },

  // Low stock raw materials
  getLowStockItems: async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, sku, current_quantity, low_stock_threshold, unit')
      .eq('is_active', true)
      .order('current_quantity')
      .limit(20)
    if (error) throw error
    return (data || []).filter(i => parseFloat(i.current_quantity) <= parseFloat(i.low_stock_threshold))
  },

  // Daily analytics table (if populated) — fallback to computing from sales
  getDailyAnalytics: async (days = 30) => {
    const { data, error } = await supabase
      .from('daily_analytics')
      .select('*')
      .order('analytics_date', { ascending: false })
      .limit(days)
    if (error) throw error
    return (data || []).reverse()
  },
}

export default analyticsService
