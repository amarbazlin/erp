import { supabase } from './supabase'

export const pricingService = {
  // ── Price tiers ────────────────────────────────────────────────────────────
  getTiers: async () => {
    const { data, error } = await supabase.from('price_tiers').select('*').order('discount_percent')
    if (error) throw error
    return data
  },

  createTier: async (tier) => {
    const { data, error } = await supabase.from('price_tiers').insert([tier]).select().single()
    if (error) throw error
    return data
  },

  updateTier: async (id, updates) => {
    const { data, error } = await supabase.from('price_tiers').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ── Customer price overrides ───────────────────────────────────────────────
  getOverridesForCustomer: async (customerId) => {
    const { data, error } = await supabase
      .from('customer_price_overrides')
      .select('*, products(product_name, selling_price)')
      .eq('customer_id', customerId)
    if (error) throw error
    return data
  },

  setOverride: async (customerId, productId, price, validUntil = null) => {
    const { data, error } = await supabase
      .from('customer_price_overrides')
      .upsert([{ customer_id: customerId, product_id: productId, price, valid_until: validUntil }], { onConflict: 'customer_id,product_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  deleteOverride: async (customerId, productId) => {
    const { error } = await supabase
      .from('customer_price_overrides')
      .delete()
      .eq('customer_id', customerId)
      .eq('product_id', productId)
    if (error) throw error
  },

  // ── Key function: resolve final price for a customer + product ─────────────
  // Priority: customer override > tier discount > default selling price
  resolvePrice: async (customerId, productId, basePrice) => {
    if (!customerId) return parseFloat(basePrice)

    // 1. Check for direct price override
    const { data: override } = await supabase
      .from('customer_price_overrides')
      .select('price, valid_until')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single()

    if (override) {
      const expired = override.valid_until && new Date(override.valid_until) < new Date()
      if (!expired) return parseFloat(override.price)
    }

    // 2. Check for tier discount
    const { data: customer } = await supabase
      .from('customers')
      .select('price_tiers(discount_percent)')
      .eq('id', customerId)
      .single()

    const discount = customer?.price_tiers?.discount_percent || 0
    if (discount > 0) {
      return parseFloat(basePrice) * (1 - discount / 100)
    }

    return parseFloat(basePrice)
  },

  // Batch resolve prices for a whole sale (more efficient)
  resolvePriceBatch: async (customerId, items) => {
    if (!customerId) return items.map(i => ({ ...i, resolved_price: parseFloat(i.selling_price) }))

    const [{ data: overrides }, { data: customer }] = await Promise.all([
      supabase.from('customer_price_overrides').select('product_id, price, valid_until').eq('customer_id', customerId),
      supabase.from('customers').select('price_tiers(discount_percent)').eq('id', customerId).single(),
    ])

    const discount = customer?.price_tiers?.discount_percent || 0
    const overrideMap = {}
    for (const ov of overrides || []) {
      const expired = ov.valid_until && new Date(ov.valid_until) < new Date()
      if (!expired) overrideMap[ov.product_id] = parseFloat(ov.price)
    }

    return items.map(item => {
      let price = parseFloat(item.selling_price)
      if (overrideMap[item.id]) price = overrideMap[item.id]
      else if (discount > 0) price = price * (1 - discount / 100)
      return { ...item, resolved_price: price }
    })
  },
}

export default pricingService
