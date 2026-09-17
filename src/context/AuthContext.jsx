import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // PGRST116 = no rows — that's the "missing profile" case, handled below.
      // Any other error is a real failure (e.g. RLS).
      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch profile:', error.message)
        setProfile(null)
        return
      }

      if (data) {
        setProfile(data)
        return
      }

      // A profile row may already exist for this email under a different id —
      // adopt it rather than failing the email UNIQUE constraint.
      if (email) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle()
        if (byEmail) {
          setProfile(byEmail)
          return
        }
      }

      // Self-heal: logged-in user has no profile row yet — create one as admin
      const { data: created, error: createErr } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email || null,
          full_name: 'Administrator',
          role: 'admin',
          password_hash: 'managed-by-supabase-auth',
        })
        .select()
        .maybeSingle()

      if (createErr || !created) {
        console.error('Failed to create missing profile:', createErr?.message)
        setProfile(null)
      } else {
        setProfile(created)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
