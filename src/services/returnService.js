import { supabase } from './supabase'

const genReturnNumber = () => `RET-${Date.now().toString().slice(-8)}`

export const returnService = {
  getAll: async ({ limit = 100, from = null, to = null } = {}) => {
    let q = supabase
      .from('returns')
      .select(`
        *,
        customers(id, name),
        return_items(*, products(product_name, product_code))
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lte('created_at', to)

    const { data, error } = await q
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        customers(id, name, phone),
        return_items(*, products(product_name, product_code, unit))
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Create a return — restores stock automatically
  create: async ({ originalSaleId, customerId, items, reason, returnType = 'sale_return', processedBy }) => {
    const total = items.reduce((s, i) => s + i.subtotal, 0)

    const { data: ret, error } = await supabase
      .from('returns')
      .insert([{
        return_number: genReturnNumber(),
        original_sale_id: originalSaleId || null,
        customer_id: customerId || null,
        return_type: returnType,
        total_amount: total,
        reason,
        processed_by: processedBy,
      }])
      .select()
      .single()
    if (error) throw error

    // Insert return items
    const retItems = items.map(i => ({
      return_id: ret.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      condition: i.condition || 'good',
    }))
    await supabase.from('return_items').insert(retItems)

    // Restore stock for good/defective items (not damaged beyond use)
    for (const item of items.filter(i => i.condition !== 'damaged')) {
      const { data: product } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
      const newQty = (product?.quantity || 0) + item.quantity
      await supabase.from('products').update({ quantity: newQty }).eq('id', item.product_id)
      await supabase.from('inventory_transactions').insert([{
        product_id: item.product_id,
        transaction_type: 'return',
        quantity: item.quantity,
        previous_stock: product?.quantity,
        new_stock: newQty,
        reference_id: ret.id,
        notes: `Return ${ret.return_number}`,
      }])
    }

    // If credit return, reduce customer balance
    if (customerId && returnType === 'sale_return') {
      const { data: customer } = await supabase.from('customers').select('current_balance').eq('id', customerId).single()
      const newBalance = Math.max(0, (parseFloat(customer?.current_balance) || 0) - total)
      await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    }

    return ret
  },

  markCreditNoteIssued: async (returnId) => {
    const { error } = await supabase.from('returns').update({ credit_note_issued: true }).eq('id', returnId)
    if (error) throw error
  },

  getSummary: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const { data, error } = await supabase
      .from('returns')
      .select('total_amount, return_type')
      .gte('created_at', from.toISOString())
    if (error) throw error
    return {
      count: data?.length || 0,
      total: (data || []).reduce((s, r) => s + parseFloat(r.total_amount), 0),
    }
  },
}

export default returnService
