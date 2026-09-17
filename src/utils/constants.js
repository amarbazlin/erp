// App info
export const APP_NAME = 'SweetERP'
export const APP_VERSION = '1.0.0'

// Stock status thresholds (for available product stock)
export const STOCK_STATUS = {
  OUT_OF_STOCK: 'out_of_stock',
  LOW:          'low',
  NORMAL:       'normal',
  OVERSTOCKED:  'overstocked',
}

export const getStockStatus = (quantity, threshold = 5) => {
  const q = parseFloat(quantity) || 0
  if (q <= 0) return STOCK_STATUS.OUT_OF_STOCK
  if (q <= threshold) return STOCK_STATUS.LOW
  return STOCK_STATUS.NORMAL
}

// Raw material units (matches inventory_items.unit constraint)
export const MATERIAL_UNITS = ['g', 'ml', 'unit']

// Unit display labels
export const UNIT_LABELS = { g: 'grams', ml: 'millilitres', unit: 'units' }

// Stock movement types (matches inventory_transactions constraint)
export const TRANSACTION_TYPES = {
  PURCHASE:   'purchase',   // adds stock
  SALE:       'sale',       // deducts stock
  ADJUSTMENT: 'adjustment', // sets absolute level
  WASTE:      'waste',      // deducts stock
  RETURN:     'return',     // adds stock
}

export const TRANSACTION_LABELS = {
  purchase:   'Purchase',
  sale:       'Sale',
  adjustment: 'Adjustment',
  waste:      'Waste',
  return:     'Return',
}

export const TRANSACTION_COLORS = {
  purchase:   '#22c55e',
  sale:       '#f97316',
  adjustment: '#3b82f6',
  waste:      '#ef4444',
  return:     '#8b5cf6',
}

// Payment methods (matches sales constraint)
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'online']

export const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
}

// Quantity display — grams/ml shown nicely
export const formatQty = (qty, unit = 'g') => {
  const n = parseFloat(qty) || 0
  if (unit === 'g' && n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)} kg`
  if (unit === 'ml' && n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)} L`
  return `${n} ${unit}`
}

// Sidebar nav items — centralised so both Sidebar and Routes use same structure
export const NAV_ITEMS = [
  { path: '/',             label: 'Dashboard',   icon: 'LayoutDashboard', exact: true },
  { path: '/pos',          label: 'POS / Sales', icon: 'ShoppingCart' },
  { path: '/products',     label: 'Products',    icon: 'Cake'      },
  { path: '/inventory',    label: 'Inventory',   icon: 'Package'   },
  { path: '/customers',    label: 'Customers',   icon: 'Users2'    },
  { path: '/analytics',    label: 'Analytics',   icon: 'BarChart3' },
  { path: '/settings',     label: 'Settings',    icon: 'Settings'  },
]

