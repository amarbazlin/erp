import React from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import StockStatusBadge from './StockStatusBadge'
import { formatCurrency } from '../../utils/formatters'
import { calcMargin } from '../../utils/calculations'
import Loader from '../shared/Loader'

const ProductTable = ({ products = [], loading = false, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader />
      </div>
    )
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Code</th>
          <th>Category</th>
          <th>Supplier</th>
          <th>Stock</th>
          <th>Buy Price</th>
          <th>Sell Price</th>
          <th>Margin</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <tr>
            <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              No products found
            </td>
          </tr>
        ) : products.map(p => {
          const margin = calcMargin(p.buying_price, p.selling_price)
          return (
            <tr key={p.id}>
              <td>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.product_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.unit}</div>
              </td>
              <td>
                <span style={{ fontFamily: 'monospace', fontSize: 11.5, background: 'var(--content-bg)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                  {p.product_code}
                </span>
              </td>
              <td style={{ fontSize: 12.5 }}>{p.categories?.name || '—'}</td>
              <td style={{ fontSize: 12.5 }}>{p.suppliers?.supplier_name || '—'}</td>
              <td>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: p.quantity === 0 ? 'var(--danger)' : p.quantity <= p.reorder_level ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {p.quantity}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>min {p.reorder_level}</div>
              </td>
              <td style={{ fontSize: 13 }}>{formatCurrency(p.buying_price)}</td>
              <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.selling_price)}</td>
              <td>
                <span style={{
                  fontSize: 12, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                  color: margin >= 25 ? 'var(--success)' : margin >= 10 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  {margin.toFixed(1)}%
                </span>
              </td>
              <td><StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} /></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(p)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit2 size={13} color="var(--text-secondary)" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(p)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #fecaca', background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} color="var(--danger)" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ProductTable
