import React from 'react'
import { getStockStatus, STOCK_STATUS } from '../../utils/constants'

const CONFIG = {
  [STOCK_STATUS.OUT_OF_STOCK]: { label: 'Out of Stock', bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
  [STOCK_STATUS.CRITICAL]:     { label: 'Critical', bg: '#fff1f2', color: '#be123c', dot: '#be123c' },
  [STOCK_STATUS.LOW]:          { label: 'Low Stock', bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  [STOCK_STATUS.NORMAL]:       { label: 'In Stock', bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  [STOCK_STATUS.OVERSTOCKED]:  { label: 'Overstocked', bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
}

const StockStatusBadge = ({ quantity, reorderLevel, size = 'sm' }) => {
  const status = getStockStatus(quantity, reorderLevel)
  const cfg = CONFIG[status] || CONFIG[STOCK_STATUS.NORMAL]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: size === 'sm' ? '3px 9px' : '4px 12px',
      borderRadius: 99,
      background: cfg.bg,
      color: cfg.color,
      fontSize: size === 'sm' ? 11.5 : 12.5,
      fontWeight: 600,
      fontFamily: 'Outfit, sans-serif',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

export default StockStatusBadge
