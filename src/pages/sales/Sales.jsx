import React, { useState, useEffect } from 'react'
import { Plus, ShoppingCart, ScanLine, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { useSales, useSalesSummary } from '../../hooks/useSales'
import { salesService } from '../../services/salesService'
import { pricingService } from '../../services/pricingService'
import { useAuth } from '../../context/AuthContext'
import { useProducts } from '../../hooks/useProducts'
import { customerService } from '../../services/customerService'
import { CustomerSelect } from '../../components/customers/CustomerSelect'
import BarcodeScanner from '../../components/barcode/BarcodeScanner'
import { InvoicePreview } from '../../components/delivery/DeliveryStatusBadge'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import { formatCurrency, formatDate, formatCurrencyShort } from '../../utils/formatters'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PAYMENT_METHODS } from '../../utils/constants'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { formatRangeLabel } from '../../utils/dateRange'

// ── New Sale Modal ─────────────────────────────────────────────────────────────
const SaleModal = ({ open, onClose, onCreated }) => {
  const { user } = useAuth()
  const { products } = useProducts({ status: 'active' })

  const [customer,       setCustomer]       = useState(null)
  const [items,          setItems]          = useState([{ product_id: '', quantity: 1, unit_price: 0, subtotal: 0 }])
  const [paymentMethod,  setPaymentMethod]  = useState('cash')
  const [isCredit,       setIsCredit]       = useState(false)
  const [scannerOpen,    setScannerOpen]    = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [discount,       setDiscount]       = useState(0)

  // When customer changes, re-price all items
  useEffect(() => {
    if (!customer || items.every(i => !i.product_id)) return
    const repriceItems = async () => {
      const priced = await pricingService.resolvePriceBatch(
        customer.id,
        items.filter(i => i.product_id).map(i => {
          const p = products.find(p => p.id === parseInt(i.product_id))
          return { ...p, id: i.product_id }
        })
      )
      setItems(prev => prev.map((item, idx) => {
        const resolved = priced.find(p => String(p.id) === String(item.product_id))
        if (!resolved) return item
        const up = resolved.resolved_price
        return { ...item, unit_price: up, subtotal: item.quantity * up }
      }))
    }
    repriceItems()
  }, [customer?.id])

  const updateItem = async (idx, field, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'product_id') {
        const p = products.find(p => p.id === parseInt(val))
        updated.unit_price = p?.selling_price || 0
        updated.subtotal   = updated.quantity * (p?.selling_price || 0)
      }
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? parseFloat(val) : item.quantity
        const u = field === 'unit_price' ? parseFloat(val) : item.unit_price
        updated.subtotal = q * u
      }
      return updated
    }))
    // Apply customer pricing when product changes
    if (field === 'product_id' && customer?.id && val) {
      const p = products.find(p => p.id === parseInt(val))
      if (p) {
        const resolved = await pricingService.resolvePrice(customer.id, parseInt(val), p.selling_price)
        setItems(prev => prev.map((item, i) => {
          if (i !== idx) return item
          return { ...item, unit_price: resolved, subtotal: item.quantity * resolved }
        }))
      }
    }
  }

  const handleBarcodeScan = (code) => {
    setScannerOpen(false)
    const product = products.find(p =>
      p.product_code === code || p.product_code?.replace(/-/g, '') === code.replace(/-/g, '')
    )
    if (!product) { alert(`No product found for barcode: ${code}`); return }
    const existIdx = items.findIndex(i => String(i.product_id) === String(product.id))
    if (existIdx >= 0) {
      setItems(prev => prev.map((item, i) => {
        if (i !== existIdx) return item
        const qty = item.quantity + 1
        return { ...item, quantity: qty, subtotal: qty * item.unit_price }
      }))
    } else {
      setItems(prev => {
        const blank = prev.findIndex(i => !i.product_id)
        const newItem = { product_id: String(product.id), quantity: 1, unit_price: product.selling_price, subtotal: product.selling_price }
        if (blank >= 0) return prev.map((item, i) => i === blank ? newItem : item)
        return [...prev, newItem]
      })
    }
  }

  const removeItem  = (idx) => setItems(i => i.filter((_, ii) => ii !== idx))
  const subtotal    = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)
  const total       = Math.max(0, subtotal - parseFloat(discount || 0))

  const handleSubmit = async () => {
    if (items.some(i => !i.product_id || i.quantity < 1)) return alert('Fill all items')
    if (isCredit && !customer) return alert('Select a customer for credit sales')
    setSaving(true)
    try {
      const saleItems = items.map(i => ({ ...i, product_id: parseInt(i.product_id) }))
      const sale = await salesService.create({
        items: saleItems,
        paymentMethod: isCredit ? 'credit' : paymentMethod,
        soldBy: user?.id,
        customerId: customer?.id || null,
        discountAmount: parseFloat(discount || 0),
        isCredit,
      })

      if (isCredit && customer?.id) {
        await customerService.addToBalance(customer.id, total)
      }

      setItems([{ product_id: '', quantity: 1, unit_price: 0, subtotal: 0 }])
      setCustomer(null); setDiscount(0); setIsCredit(false)
      onCreated()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="New Sale" width={680}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 15, fontWeight: 800 }}>
              Total: <span style={{ color: '#f97316' }}>{formatCurrency(total)}</span>
              {discount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({formatCurrency(parseFloat(discount))} off)</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button loading={saving} onClick={handleSubmit}>Create Sale</Button>
            </div>
          </div>
        }
      >
        <div className="form-group">
          <label>Customer</label>
          <CustomerSelect value={customer} onChange={setCustomer} />
          {customer?.price_tiers?.discount_percent > 0 && (
            <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
              ✓ {customer.price_tiers.discount_percent}% tier discount applied
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ margin: 0 }}>Items</label>
          <button onClick={() => setScannerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--card-border)', background: '#0d1117', color: '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <ScanLine size={13} /> Scan Barcode
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 100px 22px', gap: 6, marginBottom: 6 }}>
          {['Product', 'Qty', 'Unit Price', 'Subtotal', ''].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 100px 22px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <select className="input-base" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.product_name} (stock: {p.quantity})</option>)}
            </select>
            <input className="input-base" type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
            <input className="input-base" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 13, textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(item.subtotal)}</div>
            {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1 }}>×</button>}
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setItems(i => [...i, { product_id: '', quantity: 1, unit_price: 0, subtotal: 0 }])}>
          Add Item
        </Button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--card-border)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Discount (Rs.)</label>
            <input className="input-base" type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Payment Method</label>
            <select className="input-base" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={isCredit}>
              {PAYMENT_METHODS.filter(m => m !== 'credit').map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
              <input type="checkbox" checked={isCredit} onChange={e => setIsCredit(e.target.checked)} />
              Credit sale
            </label>
          </div>
        </div>

        {isCredit && customer && customer.credit_limit > 0 && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
            Credit limit: {formatCurrency(customer.credit_limit)} · Current balance: {formatCurrency(customer.current_balance)} · After this sale: {formatCurrency((customer.current_balance || 0) + total)}
          </div>
        )}
      </Modal>

      <BarcodeScanner isOpen={scannerOpen} onScan={handleBarcodeScan} onClose={() => setScannerOpen(false)} />
    </>
  )
}

// ── Expandable Sales Row Component ─────────────────────────────────────────────
const SalesRow = ({ sale }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)} 
        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
        className={expanded ? 'row-expanded' : ''}
      >
        <td style={{ width: '40px', paddingRight: 0 }}>
          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </td>
        <td>
          <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#f97316' }}>
            {sale.invoice_number}
          </span>
        </td>
        <td style={{ fontSize: 12.5 }}>
          {sale.customers?.name || <span style={{ color: 'var(--text-muted)' }}>Walk-in</span>}
        </td>
        <td style={{ fontSize: 12.5 }}>{formatDate(sale.created_at)}</td>
        <td style={{ fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Package size={13} color="#9ca3af" />
            {sale.sale_items?.length || 0} {sale.sale_items?.length === 1 ? 'item' : 'items'}
          </span>
        </td>
        <td>
          <span style={{ fontSize: 11.5, background: sale.is_credit ? '#fff7ed' : '#f3f4f6', color: sale.is_credit ? '#f97316' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: 99, fontWeight: 600, textTransform: 'capitalize' }}>
            {sale.is_credit ? 'Credit' : sale.payment_method}
          </span>
        </td>
        <td style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>
          {formatCurrency(sale.total_amount)}
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          <InvoicePreview sale={sale} />
        </td>
      </tr>

      {/* Accordion Expansion Block */}
      {expanded && (
        <tr>
          <td colSpan={8} style={{ padding: '12px 24px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ padding: '6px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Transaction Items Profile
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', paddingBottom: 6, borderBottom: '1px solid #f3f4f6', fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>
                <span>Product Name</span>
                <span style={{ textAlign: 'center' }}>Quantity</span>
                <span style={{ textAlign: 'right' }}>Unit Price</span>
                <span style={{ textAlign: 'right' }}>Subtotal</span>
              </div>
              
              {sale.sale_items && sale.sale_items.length > 0 ? (
                sale.sale_items.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 0', borderBottom: '1px solid #f9fafb', fontSize: 12.5, color: 'var(--text-primary)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>
                      {item.products?.product_name || 'Unknown Product'}{' '}
                      <small style={{ fontFamily: 'monospace', color: '#9ca3af', marginLeft: 6 }}>
                        [{item.products?.product_code}]
                      </small>
                    </span>
                    <span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {item.quantity} <small style={{ color: '#9ca3af' }}>{item.products?.unit || 'Pcs'}</small>
                    </span>
                    <span style={{ textAlign: 'right', fontFamily: 'Outfit,sans-serif' }}>
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span style={{ textAlign: 'right', fontFamily: 'Outfit,sans-serif', fontWeight: 600 }}>
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  No individual line details found for this transaction log.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Sales Page ────────────────────────────────────────────────────────────
const Sales = () => {
  const [search,     setSearch]    = useState('')
  const [showModal,  setShowModal] = useState(false)
  const dateFilter = useDateRangeFilter({ defaultDays: 30 })
  const { sales, loading, refetch } = useSales({ limit: 500, ...dateFilter.apiParams })
  const { summary, chartData }    = useSalesSummary(30)

  const filtered = sales.filter(s =>
    s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const periodTotal = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {dateFilter.isActive
              ? ` · ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)} · ${formatCurrencyShort(periodTotal)}`
              : ` · ${formatCurrencyShort(summary?.total || 0)} this month`}
          </p>
        </div>
        <div className="page-header-actions">
          <Button icon={<Plus />} onClick={() => setShowModal(true)} fullWidth>New Sale</Button>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Daily Revenue (30 days)</h3>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyShort(v).replace('Rs. ','')} width={45} />
            <Tooltip formatter={v => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2.5} fill="url(#sGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card filter-toolbar" style={{ padding: '12px 18px', marginBottom: 14 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice or customer…" width={260} />
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
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><ShoppingCart size={36} /><h3>No sales yet</h3><p>Create a new sale to get started</p></div></td></tr>
            ) : filtered.map(s => (
              <SalesRow key={s.id} sale={s} />
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <SaleModal open={showModal} onClose={() => setShowModal(false)} onCreated={refetch} />
    </div>
  )
}

export default Sales