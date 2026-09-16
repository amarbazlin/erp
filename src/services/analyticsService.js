import { supabase } from './supabase'

export const analyticsService = {
  // Revenue over time
  getRevenueChart: async (days = 90) => {
    const from = new Date()
    from.setDate(from.getDate() - days)

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', from.toISOString())
      .order('created_at')
    if (error) throw error

    // Group by week
    const grouped = {}
    ;(data || []).forEach(s => {
      const d = new Date(s.created_at)
      const week = `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' }).slice(0, 6)
      const key = s.created_at.slice(0, 7) + '-' + String(Math.ceil(d.getDate() / 7))
      if (!grouped[key]) grouped[key] = { name: label, revenue: 0, cost: 0 }
      grouped[key].revenue += parseFloat(s.total_amount)
    })
    return Object.values(grouped)
  },

  // Category breakdown
  getCategoryBreakdown: async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`quantity, buying_price, categories ( name )`)
      .eq('status', 'active')
    if (error) throw error

    const grouped = {}
    ;(data || []).forEach(p => {
      const cat = p.categories?.name || 'Uncategorized'
      if (!grouped[cat]) grouped[cat] = { name: cat, value: 0, count: 0 }
      grouped[cat].value += p.quantity * p.buying_price
      grouped[cat].count += 1
    })
    return Object.values(grouped).sort((a, b) => b.value - a.value)
  },

  // Purchase vs sale trend
  getPurchaseSaleTrend: async (months = 6) => {
    const from = new Date()
    from.setMonth(from.getMonth() - months)

    const [{ data: sales }, { data: purchases }] = await Promise.all([
      supabase.from('sales').select('total_amount, created_at').gte('created_at', from.toISOString()),
      supabase.from('purchases').select('total_amount, created_at').gte('created_at', from.toISOString()),
    ])

    const months_arr = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months_arr.push({
        name: d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' }),
        month: d.getMonth(),
        year: d.getFullYear(),
      })
    }

    return months_arr.map(m => {
      const sales_total = (sales || [])
        .filter(s => {
          const d = new Date(s.created_at)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        })
        .reduce((s, r) => s + parseFloat(r.total_amount), 0)

      const purchase_total = (purchases || [])
        .filter(p => {
          const d = new Date(p.created_at)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        })
        .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)

      return { name: m.name, sales: sales_total, purchases: purchase_total }
    })
  },

  // Supplier performance chart data
  getSupplierPerformance: async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select(`id, supplier_name, average_delivery_days, purchases ( total_amount )`)
      .eq('status', 'active')
      .limit(10)
    if (error) throw error

    return (data || []).map(s => ({
      name: s.supplier_name?.substring(0, 12),
      deliveryDays: s.average_delivery_days || 0,
      totalPurchases: (s.purchases || []).reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0),
      orderCount: (s.purchases || []).length,
    })).filter(s => s.orderCount > 0)
  },

  // Stock health overview
  getStockHealth: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, reorder_level, buying_price')
      .eq('status', 'active')
    if (error) throw error

    const total = data?.length || 0
    const outOfStock = (data || []).filter(p => p.quantity === 0).length
    const critical = (data || []).filter(p => p.quantity > 0 && p.quantity <= p.reorder_level * 0.5).length
    const low = (data || []).filter(p => p.quantity > p.reorder_level * 0.5 && p.quantity <= p.reorder_level).length
    const healthy = total - outOfStock - critical - low

    return [
      { name: 'Healthy', value: healthy, color: '#22c55e' },
      { name: 'Low', value: low, color: '#f59e0b' },
      { name: 'Critical', value: critical, color: '#ef4444' },
      { name: 'Out', value: outOfStock, color: '#9ca3af' },
    ]
  },
}

export default analyticsService
