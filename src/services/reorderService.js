import { supabase } from './supabase'

export const reorderService = {
  // ── Get all active (non-received) reorder orders ───────────────────────────
  getActive: async () => {
    const { data, error } = await supabase
      .from('reorder_orders')
      .select(`
        *,
        products(id, product_name, product_code, quantity, reorder_level, unit, buying_price),
        suppliers(id, supplier_name, phone, average_delivery_days)
      `)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  // ── Get the active order for a specific product (if any) ───────────────────
  getForProduct: async (productId) => {
    const { data } = await supabase
      .from('reorder_orders')
      .select('*')
      .eq('product_id', productId)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false })
      .limit(1)
    return data?.[0] || null
  },

  // ── Create a new reorder order ─────────────────────────────────────────────
  create: async ({ productId, supplierId, quantity, createdBy, notes = '' }) => {
    const { data, error } = await supabase
      .from('reorder_orders')
      .insert([{
        product_id:  productId,
        supplier_id: supplierId,
        quantity,
        created_by:  createdBy,
        notes,
        status:      'pending',
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ── Mark order as sent via WhatsApp ───────────────────────────────────────
  markSent: async (orderId) => {
    const { data, error } = await supabase
      .from('reorder_orders')
      .update({
        status:           'sent',
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ── Mark order received + update product stock ─────────────────────────────
  markReceived: async (orderId, qtyReceived) => {
    // 1. Get order details
    const { data: order, error: orderErr } = await supabase
      .from('reorder_orders')
      .select('product_id, quantity')
      .eq('id', orderId)
      .single()
    if (orderErr) throw orderErr

    const finalQty = qtyReceived || order.quantity

    // 2. Get current stock
    const { data: product } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', order.product_id)
      .single()

    const newStock = (product?.quantity || 0) + finalQty

    // 3. Update product stock + last_restocked
    await supabase
      .from('products')
      .update({
        quantity:       newStock,
        last_restocked: new Date().toISOString(),
      })
      .eq('id', order.product_id)

    // 4. Log inventory transaction
    await supabase
      .from('inventory_transactions')
      .insert([{
        product_id:       order.product_id,
        transaction_type: 'purchase',
        quantity:         finalQty,
        previous_stock:   product?.quantity,
        new_stock:        newStock,
        notes:            'Received via Smart Reorder',
      }])

    // 5. Auto-resolve related alerts for this product
    await supabase
      .from('alerts')
      .update({ resolved: true })
      .eq('product_id', order.product_id)
      .eq('resolved', false)
      .in('alert_type', ['low_stock', 'out_of_stock', 'reorder'])

    // 6. Mark order received
    const { data, error } = await supabase
      .from('reorder_orders')
      .update({
        status:       'received',
        received_at:  new Date().toISOString(),
        qty_received: finalQty,
      })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw error
    return { order: data, newStock }
  },

  // ── Cancel an order ────────────────────────────────────────────────────────
  cancel: async (orderId) => {
    const { error } = await supabase
      .from('reorder_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
    if (error) throw error
  },

  // ── Get history (received + cancelled) ────────────────────────────────────
  getHistory: async (limit = 30) => {
    const { data, error } = await supabase
      .from('reorder_orders')
      .select(`
        *,
        products(id, product_name, product_code),
        suppliers(id, supplier_name)
      `)
      .in('status', ['received', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
}

export default reorderService