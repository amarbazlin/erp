import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Package, Pencil, Power, AlertTriangle } from 'lucide-react'
import { productService } from '../../services/productService'
import { useRBAC } from '../../context/RBACContext'
import { P } from '../../utils/permissions'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import { formatCurrency } from '../../utils/formatters'

// Products at/below this many producible units are flagged as low stock.
const LOW_STOCK_PRODUCTS = 5

const iconBtn = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--card-border)',
  background: 'var(--card-bg)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

const FinishedProducts = () => {
  const navigate = useNavigate()
  const { can } = useRBAC()
  const canManage = can(P.MANAGE_PRODUCTS)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const [message, setMessage] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)

  const notify = useCallback((type, text) => setMessage({ type, text }), [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  // Cost, profit and available stock always come from the DB views
  // (product_cost_view + product_stock_view).
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await productService.getPerformance()
      setProducts(rows || [])
    } catch (err) {
      notify('error', 'Could not load finished products: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const displayProducts = useMemo(() => {
    let list = products
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)
      )
    }
    return list
  }, [products, search])

  const outOfStock = displayProducts.filter(p => p.available_stock <= 0).length
  const lowStock = displayProducts.filter(p => p.available_stock > 0 && p.available_stock <= LOW_STOCK_PRODUCTS).length
  const avgMargin = displayProducts.length
    ? displayProducts.reduce((s, p) => s + p.profit_margin, 0) / displayProducts.length
    : 0
  const lowStockProducts = displayProducts.filter(p => p.available_stock <= LOW_STOCK_PRODUCTS)

  const openAdd = () => navigate('/products/add', { state: { from: 'inventory' } })
  const openEdit = (p) => navigate(`/products/edit/${p.id}`, { state: { from: 'inventory' } })

  const handleToggleActive = async () => {
    setSaving(true)
    try {
      const next = !toggleTarget.is_active
      await productService.setActive(toggleTarget.id, next)
      notify('success', `${toggleTarget.name} ${next ? 'reactivated' : 'deactivated'}.`)
      setToggleTarget(null)
      await load()
    } catch (err) {
      notify('error', err.message || 'Could not update the product.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Finished Products</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''} · cost and stock calculated from recipes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load}>Refresh</Button>
          {canManage && (
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Product</Button>
          )}
        </div>
      </div>

      {/* Success / error message */}
      {message && (
        <div style={{
          padding: '9px 14px', marginBottom: 14, borderRadius: 9, fontSize: 12.5, fontWeight: 500,
          background: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
        }}>{message.text}</div>
      )}

      {/* Availability warning */}
      {lowStockProducts.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'var(--warning-bg)', border: '1px solid #fde68a' }}>
          <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--warning-text)' }}>
            <strong>{lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} can only be made in limited quantity:</strong>{' '}
            {lowStockProducts.slice(0, 5).map(p => p.name).join(', ')}
            {lowStockProducts.length > 5 ? ` +${lowStockProducts.length - 5} more` : ''}. Restock the raw materials to increase availability.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Products', value: displayProducts.length, color: '#3b82f6' },
          { label: 'Average Margin',  value: `${avgMargin.toFixed(1)}%`, color: avgMargin >= 25 ? '#16a34a' : '#d97706' },
          { label: 'Low Availability', value: lowStock, color: lowStock > 0 ? '#d97706' : '#16a34a' },
          { label: 'Out of Stock',     value: outOfStock, color: outOfStock > 0 ? '#dc2626' : '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search products or SKUs…" width={260} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Recipe Cost</th>
                <th>Selling Price</th>
                <th>Est. Profit</th>
                <th>Margin</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24 }}><Loader /></td></tr>
              ) : displayProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Package size={28} style={{ marginBottom: 8 }} />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : displayProducts.map(p => {

const margin = p.profit_margin
                return (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--content-bg)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Package size={16} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {p.sku || 'No SKU'}{!p.is_active ? ' · Inactive' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.recipe_cost)}</td>
                    <td>{formatCurrency(p.selling_price)}</td>
                    <td style={{ fontWeight: 600, color: p.estimated_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatCurrency(p.estimated_profit)}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: margin >= 25 ? 'var(--success)' : margin >= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 15, color: p.available_stock <= 0 ? 'var(--danger)' : p.available_stock <= LOW_STOCK_PRODUCTS ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {p.available_stock}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>can be made</div>
                    </td>
                    <td><StockStatusBadge quantity={p.available_stock} reorderLevel={LOW_STOCK_PRODUCTS} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {canManage && (
                          <>
                            <button style={iconBtn} onClick={() => openEdit(p)} title="Edit product and recipe">
                              <Pencil size={13} color="var(--text-secondary)" />
                            </button>
                            <button style={iconBtn} onClick={() => setToggleTarget(p)} title={p.is_active ? 'Deactivate' : 'Reactivate'}>
                              <Power size={13} color={p.is_active ? 'var(--danger)' : 'var(--success)'} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty-state helper */}
      {!loading && displayProducts.length === 0 && canManage && (
        <div className="card" style={{ padding: 24, marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            No finished products yet. Add a product with its raw-material recipe to start tracking cost and availability.
          </p>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>
            Add your first product
          </Button>
        </div>
      )}

      {/* Activate / deactivate confirm */}
      <Modal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Deactivate Product' : 'Reactivate Product'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button
              variant={toggleTarget?.is_active ? 'danger' : 'primary'}
              loading={saving}
              onClick={handleToggleActive}
            >
              {toggleTarget?.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {toggleTarget?.is_active
            ? <>Deactivate <strong>{toggleTarget?.name}</strong>? It will be hidden from the POS and product lists, but its recipe and history are kept.</>
            : <>Reactivate <strong>{toggleTarget?.name}</strong>? It will be available on the POS again.</>}
        </p>
      </Modal>
    </div>
  )
}

export default FinishedProducts
