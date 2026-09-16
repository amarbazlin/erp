import React, { useState } from 'react'
import {
  CheckCircle, AlertTriangle, Phone, ChevronDown,
  ChevronUp, Clock, X
} from 'lucide-react'
import { formatCurrencyShort } from '../../utils/formatters'
import Loader from '../shared/Loader'

// ── Supplier order card ───────────────────────────────────────────────────────

const SupplierCard = ({ group }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      border: '1.5px solid var(--card-border)',
      borderRadius: 12,
      background: 'var(--card-bg)',
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Status indicator */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 99,
            border: '2px solid var(--card-border)',
            background: 'var(--content-bg)',
          }} />
        </div>

        {/* Supplier info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {group.supplier.supplier_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
            {group.supplier.phone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <Phone size={11} />
                {group.supplier.phone}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                <AlertTriangle size={11} />
                No phone number on file
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Est. {formatCurrencyShort(group.estimatedTotal)}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          {expanded
            ? <ChevronUp size={16} color="var(--text-muted)" />
            : <ChevronDown size={16} color="var(--text-muted)" />
          }
        </button>
      </div>

      {/* Expanded: item list */}
      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--card-border)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 4, marginBottom: 6 }}>
            {['Product', 'Current', 'Reorder', 'Order Qty'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>{h}</span>
            ))}
          </div>
          {group.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 4, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.product_code}</div>
              </div>
              <span style={{ fontSize: 12.5, color: item.current_stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                {item.current_stock}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.reorder_level}</span>
              <span style={{ fontSize: 12.5, color: '#f97316', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                {item.suggested_qty} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const ReorderNotificationModal = ({ open, supplierGroups = [], loading, onDismiss }) => {
  if (!open) return null

  const totalItems = supplierGroups.reduce((s, g) => s + g.items.length, 0)
  const totalValue = supplierGroups.reduce((s, g) => s + g.estimatedTotal, 0)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(13,17,23,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 20,
        width: '100%', maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        border: '1px solid var(--card-border)',
        animation: 'slideIn 0.25s ease',
        overflow: 'hidden',
      }}>

        {/* ── Modal Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={22} color="#f97316" />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff' }}>
                End-of-Day Reorder Check
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Clock size={12} color="#6b7280" />
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {supplierGroups.length} supplier{supplierGroups.length !== 1 ? 's' : ''} need orders
                  {' · '}
                  {totalItems} items
                  {' · '}
                  Est. {formatCurrencyShort(totalValue)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        {/* ── Supplier list ─ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader size={36} /></div>
          ) : supplierGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <CheckCircle size={40} strokeWidth={1.5} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>All stocked up!</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No products are below their reorder level.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supplierGroups.map(group => (
                <SupplierCard
                  key={group.supplier.id}
                  group={group}
                />
              ))}
            </div>
          )}

        </div>

        {/* ── Footer ─ */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          flexShrink: 0, background: 'var(--card-bg)',
        }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Dismiss for today
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReorderNotificationModal
