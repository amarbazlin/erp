import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Currency formatting (Sri Lankan Rupees)
export const formatCurrency = (amount, currency = 'LKR') => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Recharts supplies a series name as argument two, not an ISO currency code.
export const formatChartCurrency = (amount) => formatCurrency(amount)

// Short currency (e.g. Rs. 1,234)
export const formatCurrencyShort = (amount) => {
  if (amount === null || amount === undefined) return '—'
  if (amount >= 1_000_000) return `Rs. ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `Rs. ${(amount / 1_000).toFixed(1)}K`
  return `Rs. ${amount.toFixed(2)}`
}

// Number formatting
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '—'
  return new Intl.NumberFormat('en-LK').format(num)
}

// Date formatting
export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export const formatDateTime = (date) => {
  return formatDate(date, 'dd MMM yyyy, hh:mm a')
}

export const formatRelative = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

// Percentage
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

// Truncate text
export const truncate = (str, length = 30) => {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '…' : str
}

// Invoice number
export const generateInvoiceNumber = (prefix = 'INV') => {
  const timestamp = Date.now().toString().slice(-8)
  return `${prefix}-${timestamp}`
}

// Capitalize
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}
