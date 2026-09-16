import React from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StockStatusBadge from '../inventory/StockStatusBadge'

const LowStockAlert = ({ products = [], maxShow = 5 }) => {
  const navigate = useNavigate()

  if (products.length === 0) return null

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #fde68a' }}>
        <AlertTriangle size={15} color="#d97706" />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
          {products.length} product{products.length !== 1 ? 's' : ''} need restocking
        </span>
      </div>
      {products.slice(0, maxShow).map(p => (
        <div
          key={p.id}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #fef3c7', cursor: 'pointer' }}
          onClick={() => navigate(`/inventory/edit/${p.id}`)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#78350f' }}>{p.product_name}</div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
              Stock: {p.quantity} · Reorder at: {p.reorder_level}
            </div>
          </div>
          <StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} />
          <ArrowRight size={13} color="#d97706" />
        </div>
      ))}
      {products.length > maxShow && (
        <button
          onClick={() => navigate('/inventory')}
          style={{ width: '100%', padding: '10px', background: '#fef3c7', border: 'none', cursor: 'pointer', fontSize: 12.5, color: '#92400e', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}
        >
          View {products.length - maxShow} more →
        </button>
      )}
    </div>
  )
}

export default LowStockAlert
