import React, { useState, useEffect } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { returnService } from '../../services/returnService'
import { useProducts } from '../../hooks/useProducts'
import { useAuth } from '../../context/AuthContext'
import { CreditNoteButton } from '../../components/delivery/DeliveryStatusBadge'
import { CustomerSelect } from '../../components/customers/CustomerSelect'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency, formatDate, formatCurrencyShort } from '../../utils/formatters'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { formatRangeLabel } from '../../utils/dateRange'
import SearchBar from '../../components/shared/SearchBar'

const ReturnModal = ({ open, onClose, onCreated }) => {
  const { user } = useAuth()
  const { products } = useProducts({ status: 'active' })
  const [customer,    setCustomer]    = useState(null)
  const [items,       setItems]       = useState([{ product_id: '', quantity: 1, unit_price: 0, subtotal: 0, condition: 'good' }])
  const [reason,      setReason]      = useState('')
  const [returnType,  setReturnType]  = useState('sale_return')
  const [saving,      setSaving]      = useState(false)

  const updateItem = (idx, field, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'product_id') {
        const p = products.find(p => p.id === parseInt(val))
        updated.unit_price = p?.selling_price || 0
        updated.subtotal = updated.quantity * (p?.selling_price || 0)
      }
      if (field === 'quantity' || field === 'unit_price') {
        updated.subtotal = (field === 'quantity' ? parseFloat(val) : item.quantity) * (field === 'unit_price' ? parseFloat(val) : item.unit_price)
      }
      return updated
    }))
  }

  const total = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)

  const handleSubmit = async () => {
    if (items.some(i => !i.product_id)) return alert('Select a product for each item')
    setSaving(true)
    try {
      await returnService.create({ customerId: customer?.id, items, reason, returnType, processedBy: user?.id })
      onCreated()
      onClose()
      setItems([{ product_id: '', quantity: 1, unit_price: 0, subtotal: 0, condition: 'good' }])
      setReason('')
      setCustomer(null)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Process Return" width={620}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSubmit}>Process Return — {formatCurrency(total)}</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Customer (optional)</label>
          <CustomerSelect value={customer} onChange={setCustomer} placeholder="Walk-in / unknown customer" />
        </div>
        <div className="form-group">
          <label>Return Type</label>
          <select className="input-base" value={returnType} onChange={e => setReturnType(e.target.value)}>
            <option value="sale_return">Sale Return</option>
            <option value="purchase_return">Purchase Return</option>
            <option value="damage">Damaged Goods</option>
          </select>
        </div>
        <div className="form-group">
          <label>Reason</label>
          <input className="input-base" value={reason} onChange={e => setReason(e.target.value)} placeholder="Wrong item, damaged, excess…" />
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 100px 110px 24px', gap: 6, marginBottom: 6 }}>
          {['Product', 'Qty', 'Unit Price', 'Subtotal', 'Condition', ''].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 100px 110px 24px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <select className="input-base" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </select>
            <input className="input-base" type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
            <input className="input-base" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13, textAlign: 'right' }}>{formatCurrency(item.subtotal)}</div>
            <select className="input-base" value={item.condition} onChange={e => updateItem(idx, 'condition', e.target.value)}>
              <option value="good">Good</option>
              <option value="defective">Defective</option>
              <option value="damaged">Damaged</option>
            </select>
            {items.length > 1 && <button onClick={() => setItems(i => i.filter((_, ii) => ii !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18 }}>×</button>}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setItems(i => [...i, { product_id: '', quantity: 1, unit_price: 0, subtotal: 0, condition: 'good' }])}>
          + Add Item
        </Button>
      </div>

      <div style={{ marginTop: 14, borderTop: '1px solid var(--card-border)', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Refund Value</div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{formatCurrency(total)}</div>
        </div>
      </div>
    </Modal>
  )
}

const Returns = () => {
  const [returns,   setReturns]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search,    setSearch]    = useState('')
  const dateFilter = useDateRangeFilter({ defaultDays: 30 })

  const fetchReturns = () => {
    setLoading(true)
    returnService.getAll({ limit: 500, ...dateFilter.apiParams })
      .then(setReturns)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReturns() }, [dateFilter.apiParams.from, dateFilter.apiParams.to])

  const TYPE_LABELS = { sale_return: 'Sale Return', purchase_return: 'Purchase Return', damage: 'Damage' }
  const filtered = returns.filter(r =>
    r.return_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const totalValue = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns & Credit Notes</h1>
          <p className="page-subtitle">
            {filtered.length} return{filtered.length !== 1 ? 's' : ''} · {formatCurrencyShort(totalValue)}
            {dateFilter.isActive && ` · ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)}`}
          </p>
        </div>
        <div className="page-header-actions">
          <Button icon={<Plus />} onClick={() => setShowModal(true)} fullWidth>Process Return</Button>
        </div>
      </div>

      <div className="card filter-toolbar" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search returns…" width={260} />
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

      <div className="card">
        <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Return #</th><th>Date</th><th>Customer</th><th>Items</th><th>Type</th><th>Reason</th><th>Total</th><th>Credit Note</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><RotateCcw size={36} /><h3>No returns</h3><p>Process a return to get started</p></div></td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#22c55e' }}>{r.return_number}</span></td>
                <td style={{ fontSize: 12.5 }}>{formatDate(r.created_at)}</td>
                <td style={{ fontSize: 12.5 }}>{r.customers?.name || '—'}</td>
                <td style={{ fontSize: 12.5 }}>{r.return_items?.length || 0} item(s)</td>
                <td><span style={{ fontSize: 11.5, background: 'var(--content-bg)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{TYPE_LABELS[r.return_type] || r.return_type}</span></td>
                <td style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#22c55e' }}>{formatCurrency(r.total_amount)}</td>
                <td><CreditNoteButton ret={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <ReturnModal open={showModal} onClose={() => setShowModal(false)} onCreated={fetchReturns} />
    </div>
  )
}

export default Returns
