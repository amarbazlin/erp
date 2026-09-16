import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Truck, MessageCircle } from 'lucide-react'
import { purchaseService } from '../../services/purchaseService'
import { supplierService } from '../../services/supplierService'
import { sendPurchaseOrderToSupplier } from '../../services/whatsappService'
import { useAuth } from '../../context/AuthContext'
import { useProducts } from '../../hooks/useProducts'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import { formatCurrency, formatDate, formatCurrencyShort } from '../../utils/formatters'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { formatRangeLabel } from '../../utils/dateRange'
const PurchaseModal = ({ open, onClose, onCreated }) => {
  const { user } = useAuth()
  const { products } = useProducts({ status: 'active' })
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_cost: 0, subtotal: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supplierService.getAll({ status: 'active' }).then(setSuppliers).catch(console.error)
  }, [])

  const addItem = () => setItems(i => [...i, { product_id: '', quantity: 1, unit_cost: 0, subtotal: 0 }])
  const removeItem = (idx) => setItems(i => i.filter((_, ii) => ii !== idx))

  const updateItem = (idx, field, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'product_id') {
        const p = products.find(p => p.id === parseInt(val))
        updated.unit_cost = p?.buying_price || 0
        updated.subtotal = updated.quantity * (p?.buying_price || 0)
      }
      if (field === 'quantity' || field === 'unit_cost') {
        const qty = field === 'quantity' ? parseFloat(val) : item.quantity
        const cost = field === 'unit_cost' ? parseFloat(val) : item.unit_cost
        updated.subtotal = qty * cost
      }
      return updated
    }))
  }

  const total = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)

  const handleSubmit = async () => {
    if (!supplierId) return alert('Select a supplier')
    if (items.some(i => !i.product_id || i.quantity < 1)) return alert('Fill all items')
    setSaving(true)
    try {
      const supplier = suppliers.find(s => s.id === parseInt(supplierId))
      const purchase = await purchaseService.create({
        supplierId: parseInt(supplierId),
        items,
        purchasedBy: user?.id,
      })

      // Build enriched items with product names for WhatsApp
      const whatsappItems = items.map(item => {
        const p = products.find(pr => pr.id === parseInt(item.product_id))
        return {
          product_name: p?.product_name || 'Product',
          unit: p?.unit,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
        }
      })

      // Send WhatsApp to supplier with link to this purchase order
      if (supplier?.phone) {
        try {
          await sendPurchaseOrderToSupplier({
            supplier,
            items: whatsappItems,
            invoiceNumber: purchase.invoice_number,
          })
        } catch (waErr) {
          console.error('WhatsApp send failed:', waErr)
          alert(`Purchase order ${purchase.invoice_number} created, but WhatsApp failed: ${waErr.message}`)
          setItems([{ product_id: '', quantity: 1, unit_cost: 0, subtotal: 0 }])
          setSupplierId('')
          onCreated(purchase.invoice_number)
          onClose()
          return
        }
      } else {
        alert(`Purchase order ${purchase.invoice_number} created. Add a supplier phone number to enable WhatsApp notifications.`)
      }

      setItems([{ product_id: '', quantity: 1, unit_cost: 0, subtotal: 0 }])
      setSupplierId('')
      onCreated(purchase.invoice_number)
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSubmit} icon={<MessageCircle size={14} />}>Confirm & Send PO — {formatCurrency(total)}</Button></>}>
      <div className="form-group">
        <label>Supplier *</label>
        <select className="input-base" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">Select supplier</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>
              {s.supplier_name}{s.phone ? '' : ' (no WhatsApp)'}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <div className="po-item-header hide-mobile">
          <span>Product</span>
          <span>Qty</span>
          <span>Unit Cost</span>
          <span>Subtotal</span>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="po-item-grid" style={{ marginBottom: 10 }}>
            <div className="po-product-field">
              <span className="po-label show-mobile" style={{ display: 'none' }}>Product</span>
              <select className="input-base" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
              </select>
            </div>
            <div>
              <span className="po-label show-mobile" style={{ display: 'none' }}>Qty</span>
              <input className="input-base" type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <span className="po-label show-mobile" style={{ display: 'none' }}>Unit Cost</span>
              <input className="input-base" type="number" step="0.01" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} />
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13, textAlign: 'right' }}>{formatCurrency(item.subtotal)}</div>
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1 }}>×</button>
            )}
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" icon={<Plus />} onClick={addItem}>Add Item</Button>

      <div style={{ marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Order Value</div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(total)}</div>
        </div>
      </div>
    </Modal>
  )
}

const PurchaseMobileCard = ({ purchase, highlighted }) => (
  <div
    className="mobile-data-card"
    style={highlighted ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px rgba(249,115,22,0.15)' } : {}}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{purchase.invoice_number}</span>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--info)' }}>{formatCurrency(purchase.total_amount)}</span>
    </div>
    <div className="mobile-data-card-row">
      <span className="mobile-data-card-label">Supplier</span>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{purchase.suppliers?.supplier_name}</span>
    </div>
    <div className="mobile-data-card-row">
      <span className="mobile-data-card-label">Date</span>
      <span>{formatDate(purchase.created_at)}</span>
    </div>
    <div className="mobile-data-card-row">
      <span className="mobile-data-card-label">Items</span>
      <span>{purchase.purchase_items?.length || 0} item(s)</span>
    </div>
    <div className="mobile-data-card-row">
      <span className="mobile-data-card-label">Ordered By</span>
      <span>{purchase.users?.full_name || '—'}</span>
    </div>
  </div>
)

const Purchases = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightPo = searchParams.get('po')

  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(highlightPo || '')
  const [showModal, setShowModal] = useState(false)
  const dateFilter = useDateRangeFilter({ defaultDays: 30 })

  const fetchPurchases = () => {
    setLoading(true)
    purchaseService.getAll({ limit: 500, ...dateFilter.apiParams })
      .then(setPurchases)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPurchases() }, [dateFilter.apiParams.from, dateFilter.apiParams.to])

  // Scroll to highlighted PO when opened from WhatsApp link
  useEffect(() => {
    if (!highlightPo || loading) return
    const el = document.getElementById(`po-${highlightPo}`)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [highlightPo, loading, purchases])

  const handleCreated = (invoiceNumber) => {
    fetchPurchases()
    if (invoiceNumber) {
      setSearchParams({ po: invoiceNumber })
      setSearch(invoiceNumber)
    }
  }

  const filtered = purchases.filter(p =>
    p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.suppliers?.supplier_name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalThisMonth = purchases
    .filter(p => new Date(p.created_at).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">
            {filtered.length} order{filtered.length !== 1 ? 's' : ''}
            {dateFilter.isActive
              ? ` · ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)}`
              : ` · ${formatCurrencyShort(totalThisMonth)} this month`}
          </p>
        </div>
        <div className="page-header-actions">
          <Button icon={<Plus />} onClick={() => setShowModal(true)} fullWidth>New Purchase Order</Button>
        </div>
      </div>

      {highlightPo && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, background: '#fff7ed', borderColor: '#fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#92400e' }}>
            Showing purchase order <strong>{highlightPo}</strong>
          </span>
          <button
            onClick={() => { setSearchParams({}); setSearch('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: '#f97316', fontWeight: 600 }}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Summary row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Orders', value: purchases.length, color: '#3b82f6' },
          { label: 'This Month', value: formatCurrencyShort(totalThisMonth), color: '#f97316' },
          { label: 'Suppliers Used', value: [...new Set(purchases.map(p => p.supplier_id))].length, color: '#22c55e' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: c.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.label}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card filter-toolbar" style={{ padding: '12px 20px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by PO number or supplier..." width={260} />
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
      </div>

      {/* Desktop table */}
      <div className="card hide-mobile">
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Ordered By</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Truck size={36} /><h3>No purchase orders</h3><p>Create a purchase order to restock inventory</p></div></td></tr>
              ) : filtered.map(p => (
                <tr
                  key={p.id}
                  id={`po-${p.invoice_number}`}
                  style={highlightPo === p.invoice_number ? { background: '#fff7ed' } : {}}
                >
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{p.invoice_number}</span></td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(p.created_at)}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.suppliers?.supplier_name}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{p.purchase_items?.length || 0} item(s)</td>
                  <td style={{ fontSize: 12.5 }}>{p.users?.full_name || '—'}</td>
                  <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--info)' }}>{formatCurrency(p.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="show-mobile mobile-card-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader /></div>
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><Truck size={36} /><h3>No purchase orders</h3><p>Create a purchase order to restock inventory</p></div></div>
        ) : filtered.map(p => (
          <div key={p.id} id={`po-${p.invoice_number}`}>
            <PurchaseMobileCard purchase={p} highlighted={highlightPo === p.invoice_number} />
          </div>
        ))}
      </div>

      <PurchaseModal open={showModal} onClose={() => setShowModal(false)} onCreated={handleCreated} />
    </div>
  )
}

export default Purchases
