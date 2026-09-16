import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Edit2, Trash2, ScanLine, Download } from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useProducts'
import { productService } from '../../services/productService'
import BarcodeScanner from '../../components/barcode/BarcodeScanner'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import SearchBar from '../../components/shared/SearchBar'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import Modal from '../../components/shared/Modal'
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters'
import { calcMargin } from '../../utils/calculations'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { isDateInRange, formatRangeLabel } from '../../utils/dateRange'

const Inventory = () => {
  const navigate = useNavigate()
  const [search,         setSearch]         = useState('')
  const [selectedCat,    setSelectedCat]    = useState('')
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const [scannerOpen,    setScannerOpen]    = useState(false)
  const [highlightCode,  setHighlightCode]  = useState(null)

  const dateFilter = useDateRangeFilter({ defaultDays: 30 })

  const { products, loading, refetch } = useProducts({
    search, category_id: selectedCat || null, status: 'active',
  })
  const { categories } = useCategories()

  const displayProducts = useMemo(() => {
    if (!dateFilter.isActive) return products
    const { startDate, endDate } = dateFilter.applied
    return products.filter(p =>
      isDateInRange(p.created_at, startDate, endDate) ||
      isDateInRange(p.last_restocked, startDate, endDate)
    )
  }, [products, dateFilter.isActive, dateFilter.applied])

  const handleDelete = async () => {
    setDeleting(true)
    try { await productService.delete(deleteTarget.id); setDeleteTarget(null); refetch() }
    catch (err) { alert(err.message) }
    finally { setDeleting(false) }
  }

  const handleBarcodeScan = (code) => {
    setScannerOpen(false)
    setSearch(code)
    setHighlightCode(code)
    setTimeout(() => setHighlightCode(null), 3000)
  }

  const stockValue = displayProducts.reduce((s, p) => s + p.quantity * p.buying_price, 0)

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''} · {formatCurrencyShort(stockValue)} stock value
            {dateFilter.isActive && ` · added/restocked ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)}`}
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<ScanLine />} size="sm" onClick={() => setScannerOpen(true)}>Scan</Button>
          <Button variant="secondary" icon={<RefreshCw />} size="sm" onClick={refetch}>Refresh</Button>
          <Button icon={<Plus />} onClick={() => navigate('/inventory/add')}>Add Product</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Products',  value: displayProducts.length,                                                    color: '#3b82f6' },
          { label: 'Out of Stock',    value: displayProducts.filter(p => p.quantity === 0).length,                      color: '#ef4444' },
          { label: 'Low Stock',       value: displayProducts.filter(p => p.quantity > 0 && p.quantity <= p.reorder_level).length, color: '#f59e0b' },
          { label: 'Stock Value',     value: formatCurrencyShort(stockValue),                                    color: '#22c55e' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: c.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card filter-toolbar" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search products or codes…" width={260} />
        <select className="input-base" value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ width: 170, minWidth: 140 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <DateRangeFilter
          open={dateFilter.open}
          onToggle={dateFilter.openPanel}
          startDate={dateFilter.draftStart}
          endDate={dateFilter.draftEnd}
          onStartChange={dateFilter.setDraftStart}
          onEndChange={dateFilter.setDraftEnd}
          onApply={dateFilter.apply}
          onClear={dateFilter.clear}
          isActive={dateFilter.isActive}
          appliedStart={dateFilter.applied?.startDate}
          appliedEnd={dateFilter.applied?.endDate}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" icon={<Download />} size="sm">Export CSV</Button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrapper">
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
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
            ) : displayProducts.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state" style={{ padding: 48 }}>
                <ScanLine size={36} strokeWidth={1.5} />
                <h3>{search ? 'No matching products' : 'No products yet'}</h3>
                <p>{search ? 'Try a different search or scan a different barcode' : 'Add your first product to get started'}</p>
              </div></td></tr>
            ) : displayProducts.map(p => {
              const margin    = calcMargin(p.buying_price, p.selling_price)
              const highlight = highlightCode && (p.product_code === highlightCode || p.product_code?.replace(/-/g, '') === highlightCode.replace(/-/g, ''))
              return (
                <tr key={p.id} style={{ background: highlight ? '#fff7ed' : undefined, transition: 'background 0.5s' }}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>{p.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.unit}</div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11.5, background: 'var(--content-bg)', padding: '2px 6px', borderRadius: 4 }}>{p.product_code}</span></td>
                  <td style={{ fontSize: 12.5 }}>{p.categories?.name || '—'}</td>
                  <td style={{ fontSize: 12.5 }}>{p.suppliers?.supplier_name || '—'}</td>
                  <td>
                    <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 15, color: p.quantity === 0 ? 'var(--danger)' : p.quantity <= p.reorder_level ? 'var(--warning)' : 'var(--text-primary)' }}>{p.quantity}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>min {p.reorder_level}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{formatCurrency(p.buying_price)}</td>
                  <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.selling_price)}</td>
                  <td>
                    <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'Outfit,sans-serif', color: margin >= 25 ? 'var(--success)' : margin >= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                  <td><StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => navigate(`/inventory/edit/${p.id}`)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={12} color="var(--text-secondary)" />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={12} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product"
        footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button></>}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Delete <strong>{deleteTarget?.product_name}</strong>? It will be marked inactive and hidden from reports.
        </p>
      </Modal>

      {/* Barcode scanner */}
      <BarcodeScanner isOpen={scannerOpen} onScan={handleBarcodeScan} onClose={() => setScannerOpen(false)} />
    </div>
  )
}

export default Inventory
