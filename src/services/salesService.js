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
        customers(id, full_name, phone),
        sale_items(
          id, quantity, unit_price, unit_cost, total_price, total_cost,
          products(id, name, sku, image_url)
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
        customers(id, full_name, phone, address),
        sale_items(*, products(name, sku, image_url))
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // ── Create sale ─────────────────────────────────────────────────────────────
  // items: [{ product_id, name, quantity, unit_price, unit_cost }]
  // Raw-material stock is NOT deducted here — deductInventory() is called
  // separately so the UI can confirm before committing both steps.
  create: async ({ items, paymentMethod = 'cash', cashierId, customerId = null, discount = 0, tax = 0, notes = '' }) => {
    const subtotal = items.reduce((s, i) => s + parseFloat(i.unit_price) * parseInt(i.quantity), 0)
    const total    = Math.max(0, subtotal - parseFloat(discount || 0) + parseFloat(tax || 0))
    const invoiceNumber = generateInvoiceNumber('INV')

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert([{
        invoice_number: invoiceNumber,
        customer_id:    customerId || null,
        cashier_id:     cashierId || null,
        subtotal,
        discount:       parseFloat(discount || 0),
        tax:            parseFloat(tax || 0),
        total,
        payment_method: paymentMethod,
        payment_status: 'paid',
        sale_status:    'completed',
        notes,
      }])
      .select()
      .single()
    if (saleErr) throw saleErr

    const saleItems = items.map(i => ({
      sale_id:     sale.id,
      product_id:  i.product_id,
      quantity:    parseInt(i.quantity),
      unit_price:  parseFloat(i.unit_price),
      unit_cost:   parseFloat(i.unit_cost || 0),
      total_price: parseFloat(i.unit_price) * parseInt(i.quantity),
      total_cost:  parseFloat(i.unit_cost || 0) * parseInt(i.quantity),
    }))
    const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
    if (itemsErr) throw itemsErr

    return sale
  },

  // ── Deduct raw materials for sold items (via recipes + DB trigger) ──────────
  // For each sale item, insert a 'sale' transaction per recipe ingredient.
  deductInventory: async (sale) => {
    const items = await supabase
      .from('sale_items')
      .select('product_id, quantity, products(name)')
      .eq('sale_id', sale.id)
    if (items.error) throw items.error

    for (const item of items.data || []) {
      const { data: recipe, error: rErr } = await supabase
        .from('product_recipes')
        .select('inventory_item_id, quantity_required')
        .eq('product_id', item.product_id)
      if (rErr) throw rErr

      for (const r of recipe || []) {
        const { error: tErr } = await supabase
          .from('inventory_transactions')
          .insert([{
            inventory_item_id: r.inventory_item_id,
            transaction_type:  'sale',
            quantity:          parseFloat(r.quantity_required) * parseInt(item.quantity),
            reference_id:      sale.id,
            notes:             `Sale ${sale.invoice_number} — ${item.products?.name || ''}`,
          }])
        if (tErr) throw tErr
      }
    }
  },

  // ── Dashboard summary (uses dashboard_summary view) ─────────────────────────
  getSummary: async () => {
    const { data, error } = await supabase
      .from('dashboard_summary')
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  // ── Daily chart data ────────────────────────────────────────────────────────
  getDailyChart: async (days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - days)

    const { data, error } = await supabase
      .from('sales')
      .select('total, created_at')
      .eq('sale_status', 'completed')
      .gte('created_at', from.toISOString())
      .order('created_at')
    if (error) throw error

    const grouped = {}
    for (const s of data || []) {
      const day = s.created_at.slice(0, 10)
      grouped[day] = (grouped[day] || 0) + parseFloat(s.total)
    }
    return Object.entries(grouped).map(([date, amount]) => ({ date, amount }))
  },

  // ── Top selling products ────────────────────────────────────────────────────
  getTopProducts: async (limit = 10) => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('quantity, total_price, products(id, name, sku, image_url)')
      .limit(1000)
    if (error) throw error

    const grouped = {}
    for (const item of data || []) {
      const id = item.products?.id
      if (!id) continue
      if (!grouped[id]) grouped[id] = { product: item.products, qty: 0, revenue: 0 }
      grouped[id].qty     += item.quantity
      grouped[id].revenue += parseFloat(item.total_price)
    }
    return Object.values(grouped)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit)
  },

  // ── Payment methods (matches DB constraint) ─────────────────────────────────
  PAYMENT_METHODS: ['cash', 'card', 'bank_transfer', 'online'],
}

export default salesService
