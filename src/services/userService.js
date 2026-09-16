import { supabase } from './supabase'

export const userService = {
  // Get all users (admin only)
  getAll: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Get single user
  getById: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Update a user's role (super_admin only)
  updateRole: async (userId, role) => {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Update user profile
  update: async (userId, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Deactivate / reactivate user (store status in users table)
  setStatus: async (userId, status) => {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Invite a new user — creates Supabase Auth user + registers in users table
  // Note: requires service_role key on backend; in client-side apps, use
  // Supabase "Invite User" from the dashboard or a serverless function.
  // This creates a profile entry assuming Auth user already exists.
  createProfile: async ({ id, fullName, email, role }) => {
    const { data, error } = await supabase
      .from('users')
      .insert([{ id, full_name: fullName, email, role, status: 'active' }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Get user count by role (for dashboard stats)
  getRoleSummary: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('role, status')
    if (error) throw error

    const summary = {}
    for (const u of data || []) {
      if (!summary[u.role]) summary[u.role] = { total: 0, active: 0 }
      summary[u.role].total  += 1
      if (u.status !== 'inactive') summary[u.role].active += 1
    }
    return summary
  },
}

export default userService