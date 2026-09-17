import { supabase } from './supabase'
import { compressImage, validateImageFile } from '../utils/imageUtils'

// Bucket used for finished-product images (created by the DB setup script).
const PRODUCT_IMAGE_BUCKET = 'product-images'

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

  // ── Product image upload ───────────────────────────────────────────────────
  // Compresses the image, uploads it to Supabase Storage and returns a public
  // URL. If the storage bucket is unavailable the compressed image is returned
  // as a data URL so the product can still be saved (with a warning).
  uploadProductImage: async (file) => {
    const invalid = validateImageFile(file)
    if (invalid) throw new Error(invalid)

    const { blob, dataUrl } = await compressImage(file)
    const objectPath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

    try {
      const { error } = await supabase
        .storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(objectPath, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
      if (error) throw error

      const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath)
      return { url: data.publicUrl, stored: true, warning: null }
    } catch (err) {
      // Storage bucket not configured (or RLS blocked it) — fall back to an
      // inline data URL so the admin's upload is not lost.
      return {
        url: dataUrl,
        stored: false,
        warning: 'Image saved inline (storage bucket unavailable). Run the storage section of NEW_SQL_QUERY.SQL to enable image hosting.',
      }
    }
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

  // Products merged with the DB cost + available-stock views.
  // This is the single source of truth for the inventory/products screens —
  // cost, profit and available stock always come from the database, never from
  // client-side duplication of the recipe maths.
  getPerformance: async ({ search = '', category_id = null, activeOnly = false } = {}) => {
    let query = supabase
      .from('products')
      .select('*, product_categories ( id, name )')
      .order('name')

    if (activeOnly) query = query.eq('is_active', true)
    if (category_id) query = query.eq('category_id', category_id)
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)

    const [productsRes, costsRes, stockRes] = await Promise.all([
      query,
      supabase.from('product_cost_view').select('*'),
      supabase.from('product_stock_view').select('*'),
    ])

    if (productsRes.error) throw productsRes.error
    if (costsRes.error) throw costsRes.error
    if (stockRes.error) throw stockRes.error

    const costs = Object.fromEntries((costsRes.data || []).map(r => [r.product_id, r]))
    const stock = Object.fromEntries((stockRes.data || []).map(r => [r.product_id, r]))

    return (productsRes.data || []).map(p => {
      const cost = parseFloat(costs[p.id]?.calculated_cost) || 0
      const price = parseFloat(p.selling_price) || 0
      const profit = parseFloat(costs[p.id]?.estimated_profit ?? (price - cost)) || 0
      return {
        ...p,
        recipe_cost: cost,
        estimated_profit: profit,
        profit_margin: price > 0 ? (profit / price) * 100 : 0,
        available_stock: parseInt(stock[p.id]?.available_stock) || 0,
      }
    })
  },
}

export default productService
