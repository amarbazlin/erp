import { supabase } from './supabase'
import { generateInvoiceNumber } from '../utils/formatters'

export const customerService = {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  getAll: async ({ search = '', type = null, status = 'active', from = null, to = null } = {}) => {
    let q = supabase
      .from('customers')
      .select('*, price_tiers(id, name, discount_percent)')
      .order('name')
    if (status)  q = q.eq('status', status)
    if (type)    q = q.eq('customer_type', type)
    if (search)  q = q.ilike('name', `%${search}%`)
    if (from)    q = q.gte('created_at', from)
    if (to)      q = q.lte('created_at', to)
    const { data, error } = await q
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        price_tiers(id, name, discount_percent),
        sales(id, invoice_number, total_amount, payment_method, is_credit, created_at),
        customer_payments(id, amount, method, created_at, notes)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  create: async (customer) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customer, current_balance: 0 }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('customers')
      .update({ status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },

  // ── Credit management ──────────────────────────────────────────────────────
  // Record a payment from customer (reduces their balance)
  recordPayment: async ({ customerId, amount, method = 'cash', notes = '', recordedBy }) => {
    const customer = await customerService.getById(customerId)
    const newBalance = Math.max(0, (customer.current_balance || 0) - parseFloat(amount))

    const { data: payment, error: pErr } = await supabase
      .from('customer_payments')
      .insert([{ customer_id: customerId, amount, method, notes, recorded_by: recordedBy }])
      .select()
      .single()
    if (pErr) throw pErr

    await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    return payment
  },

  // Increase balance when a credit sale is made
  addToBalance: async (customerId, amount) => {
    const { data: c } = await supabase.from('customers').select('current_balance, credit_limit').eq('id', customerId).single()
    const newBalance = (parseFloat(c?.current_balance) || 0) + parseFloat(amount)

    if (c?.credit_limit > 0 && newBalance > c.credit_limit) {
      throw new Error(`Credit limit exceeded. Limit: Rs. ${c.credit_limit.toFixed(2)}, Current: Rs. ${c.current_balance?.toFixed(2)}`)
    }

    await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    return newBalance
  },

  // ── Lookup helpers ────────────────────────────────────────────────────────
  search: async (term) => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, customer_type, credit_limit, current_balance, price_tiers(discount_percent)')
      .eq('status', 'active')
      .ilike('name', `%${term}%`)
      .limit(10)
    if (error) throw error
    return data
  },

  getSummary: async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('customer_type, current_balance, credit_limit, status')
    if (error) throw error
    const active = (data || []).filter(c => c.status === 'active')
    return {
      total: active.length,
      totalOutstanding: active.reduce((s, c) => s + (parseFloat(c.current_balance) || 0), 0),
      overLimit: active.filter(c => c.credit_limit > 0 && c.current_balance > c.credit_limit).length,
      byType: active.reduce((acc, c) => {
        acc[c.customer_type] = (acc[c.customer_type] || 0) + 1
        return acc
      }, {}),
    }
  },
}

export default customerService
