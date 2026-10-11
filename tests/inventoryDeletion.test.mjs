import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProfileId } from '../src/utils/profileId.js'
import { productDeleteBlockReason, recipeDetachNote } from '../src/utils/inventoryDeletion.js'

const PROFILE_ID = '6a03961d-f556-47b9-8f7e-2fb680d63523'
const AUTH_ID = '00caaa6b-23af-43a4-89a2-e163216e71da'

// Minimal fake for the slices of the supabase client resolveProfileId uses, so
// the lookup ordering can be verified without a network call.
const fakeClient = ({ byId = null, byAuth = null, byEmail = null, user = null } = {}) => ({
  from: () => ({
    select: () => ({
      eq: (column, value) => {
        if (column === 'id') return { maybeSingle: async () => ({ data: byId && value === byId ? { id: byId } : null }) }
        if (column === 'auth_user_id') return { maybeSingle: async () => ({ data: byAuth }) }
        return { maybeSingle: async () => ({ data: byEmail }) }
      },
    }),
  }),
  auth: { getUser: async () => ({ data: { user } }) },
})

test('resolveProfileId returns a candidate id that exists as a profile row', async () => {
  const client = fakeClient({ byId: PROFILE_ID, user: { id: AUTH_ID, email: 'admin@example.com' } })
  assert.equal(await resolveProfileId(PROFILE_ID, client), PROFILE_ID)
})

// The regression this fixes: Materials.jsx passed the Auth uid, which is not a
// users.id, and every stock write failed with a 23503 foreign key violation.
test('resolveProfileId maps an Auth uid onto the linked profile row', async () => {
  const client = fakeClient({ byAuth: { id: PROFILE_ID }, user: { id: AUTH_ID, email: 'admin@example.com' } })
  assert.equal(await resolveProfileId(AUTH_ID, client), PROFILE_ID)
})

test('resolveProfileId falls back to the profile row matching the signed-in email', async () => {
  const client = fakeClient({ byEmail: { id: PROFILE_ID }, user: { id: 'unknown-auth-id', email: 'admin@example.com' } })
  assert.equal(await resolveProfileId(null, client), PROFILE_ID)
})

// Null is the correct answer when nothing matches: every target column is
// nullable, so a missing author must never block the write.
test('resolveProfileId yields null when no profile row can be found', async () => {
  assert.equal(await resolveProfileId('missing-id', fakeClient()), null)
  assert.equal(await resolveProfileId(null, fakeClient({ user: null })), null)
})

test('resolveProfileId survives an auth failure instead of throwing', async () => {
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('offline') } }) }) }),
    auth: { getUser: async () => { throw new Error('offline') } },
  }
  assert.equal(await resolveProfileId(null, client), null)
})

test('products can only be deleted while they have no recorded sales', () => {
  assert.equal(productDeleteBlockReason(0), null)
  assert.equal(productDeleteBlockReason('0'), null)
  assert.equal(productDeleteBlockReason(null), null)
  assert.match(productDeleteBlockReason(1), /appears in 1 recorded sale and cannot be deleted/)
  assert.match(productDeleteBlockReason(4), /appears in 4 recorded sales/)
  // The block always points the admin at deactivate instead.
  assert.match(productDeleteBlockReason(4), /Deactivate it instead/)
})

test('recipe detach warnings are singular-aware and omitted when unused', () => {
  assert.equal(recipeDetachNote(0), null)
  assert.equal(recipeDetachNote(null), null)
  assert.match(recipeDetachNote(1), /used in 1 product recipe\./)
  assert.match(recipeDetachNote(1), /that recipe/)
  assert.match(recipeDetachNote(3), /used in 3 product recipes\./)
  assert.match(recipeDetachNote(3), /those recipes/)
})
