import { supabase } from './supabase'

export const alertsService = {
  getAll: async ({ resolved = false } = {}) => {
    let query = supabase
      .from('alerts')
      .select(`*, products ( id, product_name, product_code, quantity, reorder_level )`)
      .eq('resolved', resolved)
      .order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getUnresolvedCount: async () => {
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
    if (error) throw error
    return count || 0
  },

  resolve: async (id) => {
    const { error } = await supabase
      .from('alerts')
      .update({ resolved: true })
      .eq('id', id)
    if (error) throw error
  },

  resolveAll: async () => {
    const { error } = await supabase
      .from('alerts')
      .update({ resolved: true })
      .eq('resolved', false)
    if (error) throw error
  },

  create: async (alert) => {
    const { data, error } = await supabase
      .from('alerts')
      .insert([alert])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Auto-generate low stock alerts from product table
  generateLowStockAlerts: async () => {
    const { data: products } = await supabase
      .from('products')
      .select('id, product_name, quantity, reorder_level')
      .eq('status', 'active')

    const lowStock = (products || []).filter(p => p.quantity <= p.reorder_level)

    for (const p of lowStock) {
      // Check if alert already exists
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('product_id', p.id)
        .eq('resolved', false)
        .in('alert_type', ['low_stock', 'out_of_stock'])
        .limit(1)

      if (!existing || existing.length === 0) {
        const alertType = p.quantity === 0 ? 'out_of_stock' : 'low_stock'
        const severity = p.quantity === 0 ? 'critical' : (p.quantity <= p.reorder_level * 0.5 ? 'high' : 'medium')

        await supabase.from('alerts').insert([{
          product_id: p.id,
          alert_type: alertType,
          severity,
          message: p.quantity === 0
            ? `${p.product_name} is out of stock.`
            : `${p.product_name} is below reorder level. Stock: ${p.quantity}, Reorder at: ${p.reorder_level}`,
        }])
      }
    }
  },
}

export default alertsService
