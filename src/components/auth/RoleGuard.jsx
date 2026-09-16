import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useRBAC } from '../../context/RBACContext'
import { useAuth } from '../../context/AuthContext'
import Loader from '../shared/Loader'

/**
 * Protects a route group. Place it as the element of a <Route> that wraps children.
 *
 * Usage in AppRoutes.jsx:
 *   <Route element={<RoleGuard permission={P.VIEW_ANALYTICS} />}>
 *     <Route path="/analytics" element={<Analytics />} />
 *   </Route>
 *
 *   <Route element={<RoleGuard roles={['super_admin','general_manager']} />}>
 *     <Route path="/settings/users" element={<UserManagement />} />
 *   </Route>
 */
const RoleGuard = ({
  permission,
  anyOf,
  allOf,
  roles,
  minRole,
  redirectTo = '/',
}) => {
  const { loading }                         = useAuth()
  const { can, canAny, canAll, hasRole, isAtLeast } = useRBAC()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={36} />
      </div>
    )
  }

  let allowed = true
  if (permission && !can(permission))   allowed = false
  if (anyOf     && !canAny(...anyOf))   allowed = false
  if (allOf     && !canAll(...allOf))   allowed = false
  if (roles     && !hasRole(...roles))  allowed = false
  if (minRole   && !isAtLeast(minRole)) allowed = false

  if (!allowed) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

/**
 * Inline access-denied page shown when a user tries to navigate directly to a restricted URL.
 */
export const AccessDenied = () => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '70vh', gap: 16, textAlign: 'center', padding: 24,
  }}>
    <div style={{ fontSize: 48 }}>🔒</div>
    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
      Access Restricted
    </h2>
    <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
      You don't have permission to view this page.
      Contact your administrator if you believe this is an error.
    </p>
    <a href="/" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
      ← Back to Dashboard
    </a>
  </div>
)

export default RoleGuard