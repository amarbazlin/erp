import { supabase } from './supabase'

export const locationService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('status', 'active')
      .order('is_default', { ascending: false })
    if (error) throw error
    return data
  },

  getDefault: async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('is_default', true)
      .single()
    return data
  },

  create: async (location) => {
    const { data, error } = await supabase
      .from('locations')
      .insert([location])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Get stock levels for all products at a specific location
  getLocationStock: async (locationId) => {
    const { data, error } = await supabase
      .from('location_stock')
      .select('*, products(id, product_name, product_code, reorder_level, unit, buying_price, selling_price)')
      .eq('location_id', locationId)
    if (error) throw error
    return data
  },

  // Set or update stock for a product at a location
  setStock: async (productId, locationId, quantity) => {
    const { data, error } = await supabase
      .from('location_stock')
      .upsert([{ product_id: productId, location_id: locationId, quantity }], { onConflict: 'product_id,location_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Transfer stock between locations
  createTransfer: async ({ fromLocationId, toLocationId, items, transferredBy, notes = '' }) => {
    const { data: transfer, error } = await supabase
      .from('stock_transfers')
      .insert([{ from_location_id: fromLocationId, to_location_id: toLocationId, transferred_by: transferredBy, notes, status: 'pending' }])
      .select()
      .single()
    if (error) throw error

    const transferItems = items.map(i => ({ transfer_id: transfer.id, product_id: i.product_id, quantity: i.quantity }))
    await supabase.from('stock_transfer_items').insert(transferItems)
    return transfer
  },

  // Complete a transfer (actually move stock)
  completeTransfer: async (transferId) => {
    const { data: transfer } = await supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items(*)')
      .eq('id', transferId)
      .single()

    for (const item of transfer.stock_transfer_items) {
      // Deduct from source
      const { data: src } = await supabase.from('location_stock').select('quantity').eq('product_id', item.product_id).eq('location_id', transfer.from_location_id).single()
      await supabase.from('location_stock').upsert([{ product_id: item.product_id, location_id: transfer.from_location_id, quantity: Math.max(0, (src?.quantity || 0) - item.quantity) }], { onConflict: 'product_id,location_id' })

      // Add to destination
      const { data: dst } = await supabase.from('location_stock').select('quantity').eq('product_id', item.product_id).eq('location_id', transfer.to_location_id).single()
      await supabase.from('location_stock').upsert([{ product_id: item.product_id, location_id: transfer.to_location_id, quantity: (dst?.quantity || 0) + item.quantity }], { onConflict: 'product_id,location_id' })
    }

    await supabase.from('stock_transfers').update({ status: 'completed' }).eq('id', transferId)
  },

  getTransfers: async () => {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select(`*, 
        from_location:locations!from_location_id(name),
        to_location:locations!to_location_id(name),
        stock_transfer_items(*, products(product_name))
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },
}

export default locationService
