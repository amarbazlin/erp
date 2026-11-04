import React, { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { getPermissionsForRole, ROLES } from '../utils/permissions'

const RBACContext = createContext({
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  hasRole: () => false,
  isAtLeast: () => false,
  role: null,
  permissions: [],
})

// Role hierarchy — higher index = higher authority
const ROLE_HIERARCHY = [
  ROLES.CASHIER,
  ROLES.MANAGER,
  ROLES.ADMIN,
]

export const RBACProvider = ({ children }) => {
  const { profile } = useAuth()
  const role = profile?.role || null

  const permissions = useMemo(
    () => getPermissionsForRole(role),
    [role]
  )

  // True if the user has this exact permission
  const can = (permission) => {
    if (!permission) return true
    return permissions.includes(permission)
  }

  // True if the user has ANY of the listed permissions
  const canAny = (...perms) => perms.some(p => can(p))

  // True if the user has ALL listed permissions
  const canAll = (...perms) => perms.every(p => can(p))

  // True if the user has exactly one of these roles
  const hasRole = (...roles) => roles.includes(role)

  // True if the user's role is AT LEAST as high as the given role in hierarchy
  const isAtLeast = (minRole) => {
    if (!role || !minRole) return false
    return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole)
  }

  const value = { can, canAny, canAll, hasRole, isAtLeast, role, permissions }

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>
}

export const useRBAC = () => {
  const ctx = useContext(RBACContext)
  if (!ctx) throw new Error('useRBAC must be used inside RBACProvider')
  return ctx
}

export default RBACContext