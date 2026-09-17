import { supabase } from './supabase'

export const customerService = {
  getAll: async ({ search = '' } = {}) => {
    let q = supabase
      .from('customers')
      .select('*')
      .order('total_spent', { ascending: false })
    if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`)
    const { data, error } = await q
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error

    // Recent orders for this customer
    const { data: sales, error: sErr } = await supabase
      .from('sales')
      .select('id, invoice_number, total, payment_method, created_at, sale_items(quantity, total_price, products(name))')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (sErr) throw sErr

    return { ...data, recent_sales: sales || [] }
  },

  create: async (customer) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
  },
}

export default customerService
