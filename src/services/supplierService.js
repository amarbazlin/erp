import { supabase } from './supabase'

export const supplierService = {
  getAll: async ({ search = '', status = null } = {}) => {
    let query = supabase
      .from('suppliers')
      .select('*')
      .order('supplier_name')

    if (search) query = query.ilike('supplier_name', `%${search}%`)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('suppliers')
      .select(`*, products ( id, product_name, quantity, status )`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  create: async (supplier) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('suppliers')
      .update({ status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },

  // Get supplier performance (delivery days, purchase count)
  getPerformance: async () => {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`supplier_id, total_amount, suppliers ( supplier_name, average_delivery_days )`)
    if (error) throw error

    const grouped = {}
    ;(purchases || []).forEach(p => {
      const id = p.supplier_id
      if (!grouped[id]) grouped[id] = {
        supplier_name: p.suppliers?.supplier_name,
        avg_delivery: p.suppliers?.average_delivery_days,
        count: 0,
        total: 0,
      }
      grouped[id].count += 1
      grouped[id].total += parseFloat(p.total_amount || 0)
    })

    return Object.values(grouped)
  },
}

export default supplierService
