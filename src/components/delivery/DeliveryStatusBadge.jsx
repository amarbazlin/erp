// ── Delivery / customer status badges ─────────────────────────────────────────
// This module was removed together with the delivery feature but is still
// imported by the customer pages, so the badges live here (no service deps).
import React from 'react'

const STATUS_CFG = {
  pending:    { label: 'Pending',    bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  packed:     { label: 'Packed',     bg: '#f5f3ff', color: '#7c3aed', dot: '#8b5cf6' },
  dispatched: { label: 'Dispatched', bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
  delivered:  { label: 'Delivered',  bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  returned:   { label: 'Returned',   bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  failed:     { label: 'Failed',     bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  cancelled:  { label: 'Cancelled',  bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
}

export const DeliveryStatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: 11.5, fontWeight: 600,
      fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ── PricingTierBadge ──────────────────────────────────────────────────────────
export const PricingTierBadge = ({ tier }) => {
  if (!tier) return null
  const colors = { Retail: '#3b82f6', Contractor: '#f97316', Wholesale: '#8b5cf6', VIP: '#22c55e' }
  const color = colors[tier.name] || '#6b7280'
  return (
    <span style={{
      fontSize: 11, background: `${color}18`, color,
      padding: '2px 9px', borderRadius: 99, fontWeight: 700,
      fontFamily: 'Outfit, sans-serif', border: `1px solid ${color}30`,
    }}>
      {tier.name} {tier.discount_percent > 0 ? `−${tier.discount_percent}%` : ''}
    </span>
  )
}

// ── CreditStatusBadge ─────────────────────────────────────────────────────────
export const CreditStatusBadge = ({ creditLimit, currentBalance }) => {
  if (!creditLimit || creditLimit === 0) {
    return (
      <span style={{ fontSize: 11, background: 'var(--content-bg)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
        Cash only
      </span>
    )
  }
  const used = parseFloat(currentBalance) || 0
  const limit = parseFloat(creditLimit)
  const pct = Math.min(100, (used / limit) * 100)
  const isOver = used > limit
  const isHigh = pct >= 80 && !isOver
  const color = isOver ? '#dc2626' : isHigh ? '#d97706' : '#16a34a'
  const bg = isOver ? '#fef2f2' : isHigh ? '#fffbeb' : '#f0fdf4'
  const label = isOver ? 'Over limit' : isHigh ? 'Near limit' : 'Good standing'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ background: bg, color, padding: '1px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Rs.{used.toFixed(0)} / Rs.{limit.toFixed(0)}</span>
      </div>
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default DeliveryStatusBadge
