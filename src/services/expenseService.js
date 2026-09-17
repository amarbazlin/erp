import { supabase } from './supabase'

export const expenseService = {
  getAll: async ({ from = null, to = null, limit = 200 } = {}) => {
    let q = supabase
      .from('expenses')
      .select('*, users ( full_name )')
      .order('expense_date', { ascending: false })
      .limit(limit)
    if (from) q = q.gte('expense_date', from)
    if (to)   q = q.lte('expense_date', to)
    const { data, error } = await q
    if (error) throw error
    return data
  },

  create: async ({ category, description = '', amount, expenseDate = null, createdBy = null }) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        category,
        description,
        amount: parseFloat(amount),
        expense_date: expenseDate || new Date().toISOString().slice(0, 10),
        created_by: createdBy,
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  getSummary: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, category, expense_date')
      .gte('expense_date', from.toISOString().slice(0, 10))
    if (error) throw error
    const items = data || []
    const byCategory = {}
    for (const e of items) {
      byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount)
    }
    return {
      total: items.reduce((s, e) => s + parseFloat(e.amount), 0),
      count: items.length,
      byCategory: Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    }
  },
}

export default expenseService
