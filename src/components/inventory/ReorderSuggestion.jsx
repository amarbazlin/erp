import React from 'react'
import { Truck, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StockStatusBadge from './StockStatusBadge'
import { formatCurrency } from '../../utils/formatters'
import { calcMargin } from '../../utils/calculations'

const ReorderSuggestion = ({ products = [], loading = false }) => {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10, marginBottom: 10 }} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        ✓ All products sufficiently stocked
      </div>
    )
  }

  return (
    <div>
      {products.map(p => {
        const deficit = Math.max(0, p.reorder_level - p.quantity)
        const suggestedQty = Math.max(deficit, p.reorder_level)
        const estimatedCost = suggestedQty * p.buying_price
        const margin = calcMargin(p.buying_price, p.selling_price)

        return (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
              transition: 'background 0.15s', cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => navigate(`/inventory/edit/${p.id}`)}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: p.quantity === 0 ? '#fef2f2' : '#fffbeb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Truck size={15} color={p.quantity === 0 ? '#dc2626' : '#d97706'} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.product_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {p.suppliers?.supplier_name || 'No supplier'} · Order {suggestedQty} units · {formatCurrency(estimatedCost)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} />
              <span style={{ fontSize: 11, color: margin >= 20 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                {margin.toFixed(0)}% margin
              </span>
            </div>

            <ArrowRight size={14} color="var(--text-muted)" />
          </div>
        )
      })}
    </div>
  )
}

export default ReorderSuggestion
