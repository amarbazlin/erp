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
  ROLES.DRIVER,
  ROLES.SALES_REP,
  ROLES.DELIVERY_COORDINATOR,
  ROLES.PROCUREMENT_OFFICER,
  ROLES.INVENTORY_MANAGER,
  ROLES.ACCOUNTANT,
  ROLES.BRANCH_MANAGER,
  ROLES.GENERAL_MANAGER,
  ROLES.SUPER_ADMIN,
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
    const userIdx = ROLE_HIERARCHY.indexOf(role)
    const minIdx  = ROLE_HIERARCHY.indexOf(minRole)
    if (userIdx === -1 || minIdx === -1) return false
    return userIdx >= minIdx
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