import { supabase } from './supabase'

export const productService = {
  // Get all products with category and supplier
  getAll: async ({ search = '', category_id = null, status = null, from = null, to = null, dateField = 'created_at' } = {}) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories ( id, name ),
        suppliers ( id, supplier_name )
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }
    if (category_id) query = query.eq('category_id', category_id)
    if (status) query = query.eq('status', status)
    if (from && dateField === 'created_at') query = query.gte('created_at', from)
    if (to && dateField === 'created_at')   query = query.lte('created_at', to)
    if (from && dateField === 'last_restocked') query = query.gte('last_restocked', from)
    if (to && dateField === 'last_restocked')   query = query.lte('last_restocked', to)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Get single product
  getById: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select(`*, categories ( id, name ), suppliers ( id, supplier_name )`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Create product
  create: async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Update product
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

  // Delete (soft delete by setting status to inactive)
  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },

  // Get low stock products
  getLowStock: async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`*, categories ( name ), suppliers ( supplier_name )`)
      .lte('quantity', supabase.raw('reorder_level'))
      .eq('status', 'active')
      .order('quantity', { ascending: true })
    if (error) throw error
    return data
  },

  // Get products below reorder level using RPC or manual filter
  getBelowReorder: async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( name ),
      suppliers ( id, supplier_name, phone )
    `)
    .eq('status', 'active')

  if (error) throw error

  return (data || []).filter(p => p.quantity <= p.reorder_level)
  },

  // Get dead stock (never sold)
  getDeadStock: async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories ( name ),
        sale_items ( id )
      `)
      .eq('status', 'active')
    if (error) throw error
    return (data || []).filter(p => !p.sale_items || p.sale_items.length === 0)
  },

  // Adjust stock
  adjustStock: async (productId, quantity, type, notes = '') => {
    const product = await productService.getById(productId)
    const previousStock = product.quantity
    const newStock = Math.max(0, previousStock + quantity)

    const { error: txError } = await supabase
      .from('inventory_transactions')
      .insert([{
        product_id: productId,
        transaction_type: type,
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes,
      }])
    if (txError) throw txError

    const { data, error } = await supabase
      .from('products')
      .update({ quantity: newStock })
      .eq('id', productId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Get all categories
  getCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  // Create category
  createCategory: async (name, description = '') => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, description }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Get inventory transactions for a product
  getTransactions: async (productId) => {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },

  // Dashboard summary
  getSummary: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, buying_price, selling_price, reorder_level, status')
    if (error) throw error

    const active = (data || []).filter(p => p.status === 'active')
    const totalValue = active.reduce((s, p) => s + p.quantity * p.buying_price, 0)
    const lowStock = active.filter(p => p.quantity <= p.reorder_level).length
    const outOfStock = active.filter(p => p.quantity === 0).length

    return {
      totalProducts: active.length,
      totalStockValue: totalValue,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
    }
  },
}

export default productService
