// ── Permission keys ───────────────────────────────────────────────────────────
export const P = {
  // Dashboard & analytics
  VIEW_DASHBOARD:      'view:dashboard',
  VIEW_ANALYTICS:      'view:analytics',
  EXPORT_REPORTS:      'export:reports',

  // Raw material inventory
  VIEW_INVENTORY:      'view:inventory',
  MANAGE_INVENTORY:    'manage:inventory',

  // Products & recipes
  VIEW_PRODUCTS:       'view:products',
  MANAGE_PRODUCTS:     'manage:products',

  // Sales / POS
  VIEW_SALES:          'view:sales',
  CREATE_SALES:        'create:sales',

  // Customers
  VIEW_CUSTOMERS:      'view:customers',
  MANAGE_CUSTOMERS:    'manage:customers',

  // Expenses
  VIEW_EXPENSES:       'view:expenses',
  MANAGE_EXPENSES:     'manage:expenses',

  // Users & settings
  MANAGE_USERS:        'manage:users',
  MANAGE_SETTINGS:     'manage:settings',
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:   'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]:   'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.CASHIER]: 'Cashier',
}

// ── Permission map — what each role can do ─────────────────────────────────────
const ALL = Object.values(P)

export const ROLE_PERMISSIONS = {
  // Admin — full access
  [ROLES.ADMIN]: ALL,

  // Manager — everything except user management
  [ROLES.MANAGER]: [
    P.VIEW_DASHBOARD, P.VIEW_ANALYTICS, P.EXPORT_REPORTS,
    P.VIEW_INVENTORY, P.MANAGE_INVENTORY,
    P.VIEW_PRODUCTS, P.MANAGE_PRODUCTS,
    P.VIEW_SALES, P.CREATE_SALES,
    P.VIEW_CUSTOMERS, P.MANAGE_CUSTOMERS,
    P.VIEW_EXPENSES, P.MANAGE_EXPENSES,
    P.MANAGE_SETTINGS,
  ],

  // Cashier — POS sales + customers
  [ROLES.CASHIER]: [
    P.VIEW_DASHBOARD,
    P.VIEW_PRODUCTS,
    P.VIEW_SALES, P.CREATE_SALES,
    P.VIEW_CUSTOMERS, P.MANAGE_CUSTOMERS,
  ],
}

// ── Helper: resolve permissions for a role string ──────────────────────────────
export const getPermissionsForRole = (role) =>
  ROLE_PERMISSIONS[role] || []
