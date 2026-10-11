// The Supabase singleton is loaded lazily so this module stays importable
// outside a bundler (e.g. in unit tests, which always inject a fake client).
// Vite resolves the extensionless specifier the same way it does everywhere
// else in the codebase.
const defaultClient = async () => {
  try {
    const { supabase } = await import('../services/supabase')
    return supabase
  } catch {
    return null
  }
}

// ── Resolve a user id that satisfies a `users(id)` foreign key ───────────────
// `public.users.id` is the profile row's primary key — it is NOT the Supabase
// Auth uid (that link lives in `users.auth_user_id`). Columns such as
// `inventory_transactions.created_by`, `expenses.created_by` and
// `sales.cashier_id` are foreign keys to `users(id)`, so writing the raw Auth
// uid raises `23503` ("... is not present in table \"users\"") and the whole
// save fails behind an opaque message.
//
// Resolution order: the candidate id itself (when it is a real profile row) →
// the profile row of the signed-in user (by auth uid, then by email) → null,
// because every one of those target columns is nullable and a missing author
// must never block the write.
//
// `client` is injectable so the ordering can be unit-tested without a network.
export const resolveProfileId = async (candidateId = null, client = null) => {
  const db = client || await defaultClient()
  if (!db) return null

  if (candidateId) {
    const { data } = await db.from('users').select('id').eq('id', candidateId).maybeSingle()
    if (data?.id) return data.id
  }

  try {
    const { data: { user } } = await db.auth.getUser()
    if (!user) return null

    const { data: byAuth } = await db
      .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (byAuth?.id) return byAuth.id

    if (user.email) {
      const { data: byEmail } = await db
        .from('users').select('id').eq('email', user.email).maybeSingle()
      if (byEmail?.id) return byEmail.id
    }
  } catch {
    // Offline or auth unavailable — fall through to null.
  }

  return null
}

export default resolveProfileId
