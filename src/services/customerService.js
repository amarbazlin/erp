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

  // POS helper: find a customer by exact phone number, creating one if missing.
  // full_name is optional in the workflow — when absent, the phone doubles as the display name.
  resolveByPhone: async (phone) => {
    const digits = (phone || '').trim()
    if (!digits) return null
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', digits)
      .maybeSingle()
    if (findErr) throw findErr
    if (existing) return existing
    return await customerService.create({
      full_name: digits,          // falls back to the phone as the display name
      phone: digits,
      customer_type: 'retail',
    })
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

  getSummary: async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('total_orders, total_spent, created_at')
    if (error) throw error
    const items = data || []
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    return {
      total:     items.length,
      newThisMonth: items.filter(c => new Date(c.created_at) >= monthAgo).length,
      totalSpent:   items.reduce((s, c) => s + parseFloat(c.total_spent || 0), 0),
      totalOrders:  items.reduce((s, c) => s + (parseInt(c.total_orders) || 0), 0),
    }
  },
}

export default customerService
