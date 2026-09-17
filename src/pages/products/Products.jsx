import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Package } from 'lucide-react'
import { productService } from '../../services/productService'
import { useProducts } from '../../hooks/useProducts'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import SearchBar from '../../components/shared/SearchBar'
import Button from '../../components/shared/Button'
import Modal from '../../components/shared/Modal'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'
import { calcMargin } from '../../utils/calculations'

const Products = () => {
  const navigate = useNavigate()
  const [search, setSearch]     = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [costs, setCosts] = useState({})

  const { products, loading, refetch } = useProducts({ activeOnly: false })

  useEffect(() => {
    productService.getCosts().then(rows => {
      setCosts(Object.fromEntries((rows || []).map(r => [r.product_id, r])))
    }).catch(console.error)
  }, [products])

  const displayProducts = useMemo(() => {
    let list = products
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p =>
        p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)
      )
    }
    return list
  }, [products, search])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await productService.setActive(deleteTarget.id, false)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''} · recipes determine cost automatically
          </p>
        </div>
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/products/add')}>
          Add Product
        </Button>
      </div>

      {/* Filters */}<div className="card" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search products or SKUs…" width={260} />
      </div>

      {/* Table */}<div className="card">
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Margin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><Loader /></td></tr>
              ) : displayProducts.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No products found</td></tr>
              ) : (
                displayProducts.map((p) => {
                  const c = costs[p.id]
                  const cost = c?.calculated_cost || 0
                  const price = parseFloat(p.selling_price) || 0
                  // Profit margin = profit ÷ selling price (matches the Inventory
                  // finished-products panel; the DB view supplies the cost).
                  const margin = price > 0 ? ((price - cost) / price) * 100 : 0
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Package size={16} color="var(--text-muted)" />
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                        </div>
                      </td>
                      <td>{p.sku || '—'}</td>
                      <td>{formatCurrency(cost)}</td>
                      <td>{formatCurrency(price)}</td>
                      <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>{margin.toFixed(1)}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => navigate(`/products/edit/${p.id}`)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteTarget(p)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete modal */}<Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deactivate Product"
        size="sm"
      >
        <p style={{ fontSize: 13.5, marginBottom: 20 }}>
          Are you sure you want to deactivate <strong>{deleteTarget?.name}</strong>?
          This will hide it from the POS. You can reactivate it later from the product edit page.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} type="button">Cancel</Button>
          <Button variant="primary" loading={deleting} onClick={handleDelete}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  )
}

export default Products
