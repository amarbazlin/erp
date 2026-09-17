import { supabase } from './supabase'

// ── Product categories (sweets categories) ────────────────────────────────────
export const categoryService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  create: async (category) => {
    const { data, error } = await supabase
      .from('product_categories')
      .insert([category])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('product_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { error } = await supabase.from('product_categories').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Products (sellable sweets) ────────────────────────────────────────────────
export const productService = {
  // POS list — uses pos_products_view (includes available_stock + in_stock)
  getPosProducts: async () => {
    const { data, error } = await supabase
      .from('pos_products_view')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  getAll: async ({ search = '', category_id = null, activeOnly = true } = {}) => {
    let query = supabase
      .from('products')
      .select('*, product_categories ( id, name )')
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
      .from('products')
      .select('*, product_categories ( id, name ), product_recipes ( *, inventory_items ( id, name, unit, cost_per_unit ) )')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  create: async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Soft-delete / toggle active
  setActive: async (id, isActive) => {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ── Recipes ────────────────────────────────────────────────────────────────
  getRecipe: async (productId) => {
    const { data, error } = await supabase
      .from('product_recipes')
      .select('*, inventory_items ( id, name, unit, cost_per_unit )')
      .eq('product_id', productId)
    if (error) throw error
    return data
  },

  // Replace the whole recipe for a product (DB trigger recalculates cost)
  setRecipe: async (productId, items) => {
    await supabase.from('product_recipes').delete().eq('product_id', productId)
    if (!items || items.length === 0) return []
    const { data, error } = await supabase
      .from('product_recipes')
      .insert(items.map(i => ({
        product_id:        productId,
        inventory_item_id: i.inventory_item_id,
        quantity_required: parseFloat(i.quantity_required),
      })))
      .select()
    if (error) throw error
    return data
  },

  // Product cost + estimated profit from the DB view
  getCosts: async () => {
    const { data, error } = await supabase.from('product_cost_view').select('*')
    if (error) throw error
    return data
  },

  // Available stock (how many can be produced) from the DB view
  getStockView: async () => {
    const { data, error } = await supabase.from('product_stock_view').select('*')
    if (error) throw error
    return data
  },
}

export default productService
