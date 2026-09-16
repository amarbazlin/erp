import React from 'react'
import { useRBAC } from '../../context/RBACContext'

/**
 * Wraps any UI element and only renders it if the user has the required permission.
 *
 * Usage:
 *   <ProtectedComponent permission={P.DELETE_RECORDS}>
 *     <button>Delete</button>
 *   </ProtectedComponent>
 *
 *   <ProtectedComponent anyOf={[P.MANAGE_SALES, P.APPROVE_PURCHASES]}>
 *     <ActionMenu />
 *   </ProtectedComponent>
 *
 *   <ProtectedComponent roles={['super_admin', 'general_manager']}>
 *     <ProfitCard />
 *   </ProtectedComponent>
 *
 *   <ProtectedComponent minRole="branch_manager">
 *     <ApproveButton />
 *   </ProtectedComponent>
 */
const ProtectedComponent = ({
  children,
  permission,       // single permission string
  anyOf,            // array of permissions — passes if user has ANY
  allOf,            // array of permissions — passes if user has ALL
  roles,            // array of role strings — passes if user has one of these roles
  minRole,          // minimum role in hierarchy
  fallback = null,  // what to render if check fails (default nothing)
}) => {
  const { can, canAny, canAll, hasRole, isAtLeast } = useRBAC()

  let allowed = true

  if (permission && !can(permission))     allowed = false
  if (anyOf     && !canAny(...anyOf))     allowed = false
  if (allOf     && !canAll(...allOf))     allowed = false
  if (roles     && !hasRole(...roles))    allowed = false
  if (minRole   && !isAtLeast(minRole))   allowed = false

  if (!allowed) return fallback

  return <>{children}</>
}

export default ProtectedComponent