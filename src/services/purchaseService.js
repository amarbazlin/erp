import { supabase } from './supabase'
import { generateInvoiceNumber } from '../utils/formatters'

export const purchaseService = {
  getAll: async ({ limit = 50, from = null, to = null } = {}) => {
    let query = supabase
      .from('purchases')
      .select(`
        *,
        suppliers ( id, supplier_name ),
        users ( full_name ),
        purchase_items (
          id, quantity, unit_cost, subtotal,
          products ( id, product_name, product_code )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  create: async ({ supplierId, items, purchasedBy }) => {
    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const invoiceNumber = generateInvoiceNumber('PO')

    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert([{
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        total_amount: total,
        purchased_by: purchasedBy,
      }])
      .select()
      .single()
    if (error) throw error

    const purchaseItems = items.map(i => ({
      purchase_id: purchase.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      subtotal: i.subtotal,
    }))
    const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems)
    if (itemsError) throw itemsError

    // Update stock
    for (const item of items) {
      const { data: product } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
      const newQty = (product?.quantity || 0) + item.quantity
      await supabase.from('products').update({
        quantity: newQty,
        last_restocked: new Date().toISOString(),
      }).eq('id', item.product_id)

      await supabase.from('inventory_transactions').insert([{
        product_id: item.product_id,
        transaction_type: 'purchase',
        quantity: item.quantity,
        previous_stock: product?.quantity,
        new_stock: newQty,
        reference_id: purchase.id,
        notes: `Purchase ${invoiceNumber}`,
      }])
    }

    return purchase
  },

  getSummary: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const { data, error } = await supabase
      .from('purchases')
      .select('total_amount')
      .gte('created_at', from.toISOString())
    if (error) throw error
    const total = (data || []).reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
    return { total, count: data?.length || 0 }
  },
}

export default purchaseService
