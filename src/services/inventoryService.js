import { supabase } from './supabase'

// ── Raw material categories ───────────────────────────────────────────────────
export const inventoryCategoryService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  create: async ({ name, description = null }) => {
    const { data, error } = await supabase
      .from('inventory_categories')
      .insert([{ name: name.trim(), description }])
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ── Raw materials (inventory_items) — quantities in g/ml/units ────────────────
export const inventoryService = {
  getAll: async ({ search = '', category_id = null, activeOnly = true } = {}) => {
    let query = supabase
      .from('inventory_items')
      .select('*, inventory_categories ( id, name )')
      .order('name')

    if (activeOnly) query = query.eq('is_active', true)
    if (category_id) query = query.eq('category_id', category_id)
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, inventory_categories ( id, name )')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  create: async (item) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // A cost change changes every product that uses this material, so the
    // cached products.calculated_cost has to be brought back in sync.
    if (updates.cost_per_unit !== undefined) {
      await inventoryService.syncProductCosts(data.id)
    }
    return data
  },

  // Bring the cached product cost back in sync after a raw-material cost change.
  // Always uses the database's own calculation (the `refresh_product_costs`
  // function/trigger added in the setup SQL, otherwise the values exposed by
  // `product_cost_view`) — never a client-side copy of the recipe formula.
  syncProductCosts: async (inventoryItemId) => {
    // Preferred path: DB function / trigger refreshes every product at once.
    const { error } = await supabase.rpc('refresh_product_costs')
    if (!error) return

    // Fallback for databases predating the trigger: copy the cost the database
    // view calculated back into the cached column for the affected products.
    const { data: recipeRows, error: recipeErr } = await supabase
      .from('product_recipes')
      .select('product_id')
      .eq('inventory_item_id', inventoryItemId)
    if (recipeErr) return

    const productIds = [...new Set((recipeRows || []).map(r => r.product_id))]
    if (productIds.length === 0) return

    const { data: costs, error: costErr } = await supabase
      .from('product_cost_view')
      .select('product_id, calculated_cost')
      .in('product_id', productIds)
    if (costErr) return

    for (const row of costs || []) {
      await supabase
        .from('products')
        .update({ calculated_cost: row.calculated_cost, updated_at: new Date().toISOString() })
        .eq('id', row.product_id)
    }
  },

  setActive: async (id, isActive) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Summary cards
  getSummary: async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('current_quantity, cost_per_unit, low_stock_threshold, is_active')
    if (error) throw error
    const items = data || []
    const active = items.filter(i => i.is_active)
    return {
      totalItems:  active.length,
      lowStock:    active.filter(i => parseFloat(i.current_quantity) <= parseFloat(i.low_stock_threshold)).length,
      stockValue:  active.reduce((s, i) => s + (parseFloat(i.current_quantity) / 1000) * parseFloat(i.cost_per_unit), 0),
    }
  },

  // ── Stock transactions (DB trigger updates current_quantity) ────────────────
  getTransactions: async (itemId, limit = 50) => {
    let query = supabase
      .from('inventory_transactions')
      .select('*, users ( full_name )')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (itemId) query = query.eq('inventory_item_id', itemId)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Record a stock movement. quantity is positive.
  // purchase/return ADD stock, sale/waste DEDUCT, adjustment SETS absolute level.
  addTransaction: async ({ inventoryItemId, type, quantity, costPerUnit = null, referenceId = null, notes = '', createdBy = null }) => {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert([{
        inventory_item_id: inventoryItemId,
        transaction_type:  type,
        quantity:          parseFloat(quantity),
        cost_per_unit:     costPerUnit,
        reference_id:      referenceId,
        notes,
        created_by:        createdBy,
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export default inventoryService
