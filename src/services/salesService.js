import { supabase } from './supabase'
import { generateInvoiceNumber } from '../utils/formatters'

export const salesService = {
  // ── Get all sales ───────────────────────────────────────────────────────────
  getAll: async ({ limit = 100, from = null, to = null } = {}) => {
    let q = supabase
      .from('sales')
      .select(`
        *,
        users(full_name),
        customers(id, name, phone),
        locations(id, name),
        sale_items(
          id, quantity, unit_price, subtotal,
          products(id, product_name, product_code, unit)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lte('created_at', to)

    const { data, error } = await q
    if (error) throw error
    return data
  },

  // ── Get single sale ─────────────────────────────────────────────────────────
  getById: async (id) => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        users(full_name),
        customers(id, name, phone, address),
        locations(id, name),
        sale_items(*, products(product_name, product_code, unit))
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // ── Create sale (with customer, location, discount, credit support) ─────────
  create: async ({ items, paymentMethod, soldBy, customerId = null, locationId = null, discountAmount = 0, isCredit = false }) => {
    const subtotal      = items.reduce((s, i) => s + parseFloat(i.subtotal), 0)
    const total         = Math.max(0, subtotal - parseFloat(discountAmount || 0))
    const invoiceNumber = generateInvoiceNumber('INV')

    // Insert sale
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert([{
        invoice_number:  invoiceNumber,
        total_amount:    total,
        payment_method:  isCredit ? 'credit' : paymentMethod,
        sold_by:         soldBy,
        customer_id:     customerId || null,
        location_id:     locationId || null,
        discount_amount: parseFloat(discountAmount || 0),
        is_credit:       isCredit,
      }])
      .select()
      .single()
    if (saleErr) throw saleErr

    // Insert line items
    const saleItems = items.map(i => ({
      sale_id:    sale.id,
      product_id: parseInt(i.product_id),
      quantity:   i.quantity,
      unit_price: parseFloat(i.unit_price),
      subtotal:   parseFloat(i.subtotal),
    }))
    const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
    if (itemsErr) throw itemsErr

    // Deduct stock and log inventory transactions
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', item.product_id)
        .single()

      const newQty = Math.max(0, (product?.quantity || 0) - item.quantity)

      await supabase.from('products')
        .update({ quantity: newQty })
        .eq('id', item.product_id)

      await supabase.from('inventory_transactions').insert([{
        product_id:       parseInt(item.product_id),
        transaction_type: 'sale',
        quantity:         -item.quantity,
        previous_stock:   product?.quantity,
        new_stock:        newQty,
        reference_id:     sale.id,
        notes:            `Sale ${invoiceNumber}`,
      }])
    }

    return sale
  },

  // ── Dashboard summary ────────────────────────────────────────────────────────
  getSummary: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, created_at, is_credit')
      .gte('created_at', from.toISOString())
      .order('created_at')
    if (error) throw error

    const total      = (data || []).reduce((s, r) => s + parseFloat(r.total_amount), 0)
    const creditTotal= (data || []).filter(r => r.is_credit).reduce((s, r) => s + parseFloat(r.total_amount), 0)
    return { total, count: data?.length || 0, creditTotal, records: data || [] }
  },

  // ── Daily chart data ─────────────────────────────────────────────────────────
  getDailyChart: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', from.toISOString())
      .order('created_at')
    if (error) throw error

    const grouped = {}
    for (const s of data || []) {
      const day = s.created_at.slice(0, 10)
      grouped[day] = (grouped[day] || 0) + parseFloat(s.total_amount)
    }
    return Object.entries(grouped).map(([date, amount]) => ({ date, amount }))
  },

  // ── Top selling products ─────────────────────────────────────────────────────
  getTopProducts: async (limit = 10) => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('quantity, subtotal, products(id, product_name, product_code)')
      .limit(500)
    if (error) throw error

    const grouped = {}
    for (const item of data || []) {
      const id = item.products?.id
      if (!id) continue
      if (!grouped[id]) grouped[id] = { product: item.products, qty: 0, revenue: 0 }
      grouped[id].qty     += item.quantity
      grouped[id].revenue += parseFloat(item.subtotal)
    }
    return Object.values(grouped)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit)
  },
}

export default salesService
