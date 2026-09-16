// =============================================
// HardwareAI — Role-Based Access Control
// 9-tier role hierarchy
// =============================================

// ── All permission keys ────────────────────────────────────────────────────────
export const P = {
  // Dashboard
  VIEW_DASHBOARD:      'view:dashboard',

  // Analytics & reporting
  VIEW_ANALYTICS:      'view:analytics',
  VIEW_PROFITS:        'view:profits',
  VIEW_MARGINS:        'view:margins',
  EXPORT_REPORTS:      'export:reports',

  // Inventory
  VIEW_INVENTORY:      'view:inventory',
  MANAGE_INVENTORY:    'manage:inventory',
  MANAGE_STOCK:        'manage:stock',
  TRANSFER_STOCK:      'transfer:stock',
  DELETE_PRODUCTS:     'delete:products',

  // Sales
  VIEW_SALES:          'view:sales',
  CREATE_SALES:        'create:sales',
  MANAGE_SALES:        'manage:sales',
  CREATE_QUOTATIONS:   'create:quotations',

  // Purchases
  VIEW_PURCHASES:      'view:purchases',
  CREATE_PURCHASES:    'create:purchases',
  APPROVE_PURCHASES:   'approve:purchases',

  // Suppliers
  VIEW_SUPPLIERS:      'view:suppliers',
  MANAGE_SUPPLIERS:    'manage:suppliers',

  // Customers
  VIEW_CUSTOMERS:      'view:customers',
  MANAGE_CUSTOMERS:    'manage:customers',
  MANAGE_CREDITS:      'manage:credits',
  VIEW_CREDITS:        'view:credits',

  // Deliveries
  VIEW_DELIVERIES:     'view:deliveries',
  MANAGE_DELIVERIES:   'manage:deliveries',
  VIEW_OWN_DELIVERIES: 'view:own_deliveries',

  // Returns
  VIEW_RETURNS:        'view:returns',
  MANAGE_RETURNS:      'manage:returns',
  APPROVE_RETURNS:     'approve:returns',

  // Finance
  VIEW_FINANCIAL:      'view:financial',
  MANAGE_PAYMENTS:     'manage:payments',

  // Locations / branches
  VIEW_ALL_BRANCHES:   'view:all_branches',
  MANAGE_LOCATIONS:    'manage:locations',

  // Users & settings
  MANAGE_USERS:        'manage:users',
  MANAGE_ROLES:        'manage:roles',
  MANAGE_SETTINGS:     'manage:settings',
  MANAGE_PRICING:      'manage:pricing',

  // AI features
  VIEW_AI:             'view:ai',

  // Alerts
  VIEW_ALERTS:         'view:alerts',

  // Delete
  DELETE_RECORDS:      'delete:records',
}

// ── Role identifiers ──────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:          'super_admin',
  GENERAL_MANAGER:      'general_manager',
  BRANCH_MANAGER:       'branch_manager',
  INVENTORY_MANAGER:    'inventory_manager',
  SALES_REP:            'sales_rep',
  ACCOUNTANT:           'accountant',
  DELIVERY_COORDINATOR: 'delivery_coordinator',
  DRIVER:               'driver',
  PROCUREMENT_OFFICER:  'procurement_officer',
}

// ── Human-readable role labels ─────────────────────────────────────────────────
export const ROLE_LABELS = {
  super_admin:          'Super Admin / Owner',
  general_manager:      'General Manager',
  branch_manager:       'Branch Manager',
  inventory_manager:    'Inventory Manager',
  sales_rep:            'Sales Representative',
  accountant:           'Accountant',
  delivery_coordinator: 'Delivery Coordinator',
  driver:               'Driver',
  procurement_officer:  'Procurement Officer',
}

// ── Role badge colours ────────────────────────────────────────────────────────
export const ROLE_COLORS = {
  super_admin:          { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  general_manager:      { bg: '#fff7ed', color: '#f97316', border: '#fed7aa' },
  branch_manager:       { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  inventory_manager:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  sales_rep:            { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  accountant:           { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  delivery_coordinator: { bg: '#ecfeff', color: '#0891b2', border: '#a5f3fc' },
  driver:               { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  procurement_officer:  { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
}

// ── Permission map — what each role can do ─────────────────────────────────────
// '*' means all permissions (super_admin only)
const ALL = Object.values(P)

export const ROLE_PERMISSIONS = {
  // 1. Super Admin — unrestricted
  [ROLES.SUPER_ADMIN]: ALL,

  // 2. General Manager
  [ROLES.GENERAL_MANAGER]: [
    P.VIEW_DASHBOARD, P.VIEW_ANALYTICS, P.VIEW_PROFITS, P.VIEW_MARGINS,
    P.EXPORT_REPORTS,
    P.VIEW_INVENTORY, P.MANAGE_INVENTORY, P.MANAGE_STOCK, P.TRANSFER_STOCK,
    P.VIEW_SALES, P.CREATE_SALES, P.MANAGE_SALES, P.CREATE_QUOTATIONS,
    P.VIEW_PURCHASES, P.CREATE_PURCHASES, P.APPROVE_PURCHASES,
    P.VIEW_SUPPLIERS, P.MANAGE_SUPPLIERS,
    P.VIEW_CUSTOMERS, P.MANAGE_CUSTOMERS, P.MANAGE_CREDITS, P.VIEW_CREDITS,
    P.VIEW_DELIVERIES, P.MANAGE_DELIVERIES,
    P.VIEW_RETURNS, P.MANAGE_RETURNS, P.APPROVE_RETURNS,
    P.VIEW_FINANCIAL, P.MANAGE_PAYMENTS,
    P.VIEW_ALL_BRANCHES, P.MANAGE_LOCATIONS,
    P.MANAGE_USERS,
    P.VIEW_AI, P.VIEW_ALERTS,
  ],

  // 3. Branch Manager
  [ROLES.BRANCH_MANAGER]: [
    P.VIEW_DASHBOARD, P.VIEW_ANALYTICS,
    P.VIEW_INVENTORY, P.MANAGE_INVENTORY, P.MANAGE_STOCK, P.TRANSFER_STOCK,
    P.VIEW_SALES, P.CREATE_SALES, P.MANAGE_SALES, P.CREATE_QUOTATIONS,
    P.VIEW_PURCHASES, P.CREATE_PURCHASES, P.APPROVE_PURCHASES,
    P.VIEW_SUPPLIERS, P.MANAGE_SUPPLIERS,
    P.VIEW_CUSTOMERS, P.MANAGE_CUSTOMERS, P.MANAGE_CREDITS, P.VIEW_CREDITS,
    P.VIEW_DELIVERIES, P.MANAGE_DELIVERIES,
    P.VIEW_RETURNS, P.MANAGE_RETURNS, P.APPROVE_RETURNS,
    P.VIEW_ALERTS,
    P.VIEW_AI,
  ],

  // 4. Inventory Manager / Storekeeper (warehouse staff)
  [ROLES.INVENTORY_MANAGER]: [
    P.VIEW_DASHBOARD,
    P.VIEW_INVENTORY, P.MANAGE_INVENTORY, P.MANAGE_STOCK, P.TRANSFER_STOCK,
    P.VIEW_SUPPLIERS,
    P.VIEW_PURCHASES, P.CREATE_PURCHASES,
    P.VIEW_DELIVERIES, P.MANAGE_DELIVERIES,
    P.VIEW_ALERTS,
  ],

  // 5. Sales Representative / Cashier
  [ROLES.SALES_REP]: [
    P.VIEW_DASHBOARD,
    P.VIEW_INVENTORY,      // read-only stock lookup
    P.VIEW_SALES, P.CREATE_SALES, P.CREATE_QUOTATIONS,
    P.VIEW_CUSTOMERS,
    P.VIEW_DELIVERIES, P.MANAGE_DELIVERIES,
    P.VIEW_ALERTS,
  ],

  // 6. Accountant / Finance Officer
  [ROLES.ACCOUNTANT]: [
    P.VIEW_DASHBOARD,
    P.VIEW_SALES, P.VIEW_PURCHASES,
    P.VIEW_CUSTOMERS, P.VIEW_CREDITS, P.MANAGE_CREDITS, P.MANAGE_PAYMENTS,
    P.VIEW_FINANCIAL,
    P.VIEW_RETURNS,
    P.EXPORT_REPORTS,
    P.VIEW_ALERTS,
  ],

  // 7. Delivery Coordinator
  [ROLES.DELIVERY_COORDINATOR]: [
    P.VIEW_DASHBOARD,
    P.VIEW_DELIVERIES, P.MANAGE_DELIVERIES,
    P.VIEW_CUSTOMERS,
    P.VIEW_ALERTS,
  ],

  // 8. Driver — minimal access
  [ROLES.DRIVER]: [
    P.VIEW_OWN_DELIVERIES,
  ],

  // 9. Procurement Officer
  [ROLES.PROCUREMENT_OFFICER]: [
    P.VIEW_DASHBOARD,
    P.VIEW_INVENTORY,
    P.VIEW_SUPPLIERS, P.MANAGE_SUPPLIERS,
    P.VIEW_PURCHASES, P.CREATE_PURCHASES,
    P.VIEW_ALERTS,
  ],
}

// ── Nav item permission requirements ──────────────────────────────────────────
// Each route maps to the minimum permission needed to see it in the sidebar
export const NAV_PERMISSIONS = {
  '/':                        P.VIEW_DASHBOARD,
  '/inventory':               P.VIEW_INVENTORY,
  '/customers':               P.VIEW_CUSTOMERS,
  '/sales':                   P.VIEW_SALES,
  '/purchases':               P.VIEW_PURCHASES,
  '/returns':                 P.VIEW_RETURNS,
  '/order-tracking':          P.VIEW_DELIVERIES,
  '/deliveries':              P.VIEW_DELIVERIES,
  '/suppliers':               P.VIEW_SUPPLIERS,
  '/locations':               P.VIEW_ALL_BRANCHES,
  '/analytics':               P.VIEW_ANALYTICS,
  '/alerts':                  P.VIEW_ALERTS,
  '/ai/forecasting':          P.VIEW_AI,
  '/ai/recommendations':      P.VIEW_AI,
  '/ai/anomaly':              P.VIEW_AI,
  '/ai/seasonal':             P.VIEW_AI,
  '/ai/supplier-discovery':   P.VIEW_AI,
  '/settings':                P.VIEW_DASHBOARD,
}

// ── Helper: resolve permissions for a role string ──────────────────────────────
export const getPermissionsForRole = (role) =>
  ROLE_PERMISSIONS[role] || []

// ── Helper: check a single permission ─────────────────────────────────────────
export const roleHasPermission = (role, permission) => {
  const perms = getPermissionsForRole(role)
  return perms.includes(permission)
}