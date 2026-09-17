import { supabase } from './supabase'

export const userService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  create: async ({ fullName, email, password, role = 'cashier' }) => {
    // Invite via Supabase Auth admin API, then the DB row is created by trigger
    // or insert here depending on your setup. Fallback: insert profile row.
    const { data, error } = await supabase
      .from('users')
      .insert([{ full_name: fullName, email, role, password_hash: 'invited' }])
      .select('id, full_name, email, role, is_active, created_at')
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, full_name, email, role, is_active, created_at')
      .single()
    if (error) throw error
    return data
  },

  setActive: async (id, isActive) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .single()
    if (error) throw error
    return data
  },
}

export const ROLES = [
  { value: 'admin',   label: 'Admin',   description: 'Full access to everything' },
  { value: 'manager', label: 'Manager', description: 'Manage inventory, products, sales and reports' },
  { value: 'cashier', label: 'Cashier', description: 'POS sales and customers only' },
]

export default userService
