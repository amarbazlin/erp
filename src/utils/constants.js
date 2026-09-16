// App info
export const APP_NAME = 'HardwareAI'
export const APP_VERSION = '2.0.0'

// Stock status thresholds
export const STOCK_STATUS = {
  OUT_OF_STOCK: 'out_of_stock',
  CRITICAL:     'critical',
  LOW:          'low',
  NORMAL:       'normal',
  OVERSTOCKED:  'overstocked',
}

export const getStockStatus = (quantity, reorderLevel) => {
  if (quantity === 0)                           return STOCK_STATUS.OUT_OF_STOCK
  if (quantity <= reorderLevel * 0.5)           return STOCK_STATUS.CRITICAL
  if (quantity <= reorderLevel)                 return STOCK_STATUS.LOW
  if (quantity >= reorderLevel * 5)             return STOCK_STATUS.OVERSTOCKED
  return STOCK_STATUS.NORMAL
}

// Payment methods
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'credit']

// Transaction types
export const TRANSACTION_TYPES = {
  SALE:       'sale',
  PURCHASE:   'purchase',
  ADJUSTMENT: 'adjustment',
  RETURN:     'return',
  DAMAGE:     'damage',
  TRANSFER:   'transfer',
}

// Alert severity
export const ALERT_SEVERITY = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

// Alert types
export const ALERT_TYPES = {
  LOW_STOCK:    'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  PRICE_ANOMALY:'price_anomaly',
  DEMAND_SPIKE: 'demand_spike',
  DEAD_STOCK:   'dead_stock',
  REORDER:      'reorder',
}

// Roles
export const USER_ROLES = {
  ADMIN:   'admin',
  MANAGER: 'manager',
  STAFF:   'staff',
}

// Customer types
export const CUSTOMER_TYPES = {
  RETAIL:      'retail',
  CONTRACTOR:  'contractor',
  WHOLESALE:   'wholesale',
  VIP:         'vip',
}

export const CUSTOMER_TYPE_COLORS = {
  retail:     '#3b82f6',
  contractor: '#f97316',
  wholesale:  '#8b5cf6',
  vip:        '#22c55e',
}

// Order tracking / dispatch statuses
export const DELIVERY_STATUS = {
  PENDING:    'pending',
  PACKED:     'packed',
  DISPATCHED: 'dispatched',
  DELIVERED:  'delivered',
  RETURNED:   'returned',
  FAILED:     'failed',
  CANCELLED:  'cancelled',
}

// Return types
export const RETURN_TYPES = {
  SALE_RETURN:     'sale_return',
  PURCHASE_RETURN: 'purchase_return',
  DAMAGE:          'damage',
}

// Units for products
export const PRODUCT_UNITS = [
  'pcs', 'kg', 'g', 'litre', 'ml', 'box', 'bag', 'roll',
  'bundle', 'pair', 'set', 'sheet', 'meter', 'feet', 'ton',
]

// Date range options
export const DATE_RANGES = [
  { label: '7D',  value: 7   },
  { label: '1M',  value: 30  },
  { label: '3M',  value: 90  },
  { label: '6M',  value: 180 },
  { label: '1Y',  value: 365 },
]

// Sri Lankan months (for seasonal analysis)
export const SL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Key Sri Lankan seasonal events that affect hardware demand
export const SL_SEASONAL_EVENTS = [
  { month: 3,  label: 'Sinhala New Year',   impact: 'high',   note: 'Construction boom, gifting hardware sets' },
  { month: 4,  label: 'Post-Avurudu',       impact: 'high',   note: 'Peak construction, home renovation season' },
  { month: 4,  label: 'Monsoon prep',        impact: 'medium', note: 'Roofing, drainage, waterproofing demand rises' },
  { month: 5,  label: 'Vesak',              impact: 'medium', note: 'Electrical fittings, lighting demand up' },
  { month: 10, label: 'North-East Monsoon', impact: 'medium', note: 'Roofing materials, sealants high demand' },
  { month: 11, label: 'Year-end builds',    impact: 'high',   note: 'Government projects accelerate before year-end' },
  { month: 12, label: 'Christmas/New Year', impact: 'medium', note: 'Renovation & gifting season' },
]

// Sidebar nav items — centralised so both Sidebar and Routes use same structure
export const NAV_ITEMS = [
  { path: '/',             label: 'Dashboard',   icon: 'LayoutDashboard', exact: true },
  { path: '/inventory',    label: 'Inventory',   icon: 'Package'   },
  { path: '/customers',    label: 'Customers',   icon: 'Users2'    },
  { path: '/sales',        label: 'Sales',       icon: 'ShoppingCart' },
  { path: '/purchases',    label: 'Purchases',   icon: 'Truck'     },
  { path: '/returns',      label: 'Returns',     icon: 'RotateCcw' },
  { path: '/order-tracking', label: 'Order Tracking', icon: 'ClipboardList' },
  { path: '/suppliers',    label: 'Suppliers',   icon: 'Building2' },
  { path: '/locations',    label: 'Locations',   icon: 'Store'     },
  { path: '/analytics',    label: 'Analytics',   icon: 'BarChart3' },
  { path: '/alerts',       label: 'Alerts',      icon: 'Bell',  badge: true },
  {
    label: 'AI Intelligence', icon: 'Sparkles', key: 'ai',
    children: [
      { path: '/ai/forecasting',    label: 'Forecasting'          },
      { path: '/ai/recommendations',label: 'Smart Reorder'        },
      { path: '/ai/anomaly',        label: 'Anomaly Detection'    },
      { path: '/ai/seasonal',       label: 'Seasonal Demand'      },
      { path: '/ai/supplier-discovery', label: 'Supplier Discovery' },
    ],
  },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
]
