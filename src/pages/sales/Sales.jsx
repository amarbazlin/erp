import React, { useState, useMemo, useCallback } from 'react'
import {
  Search, Calendar, FileText, RefreshCw, Plus, Minus, Trash2, AlertTriangle,
  Check, ChevronRight, Receipt, CreditCard, Banknote
} from 'lucide-react'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../context/AuthContext'
import { useRBAC } from '../../context/RBACContext'
import { P } from '../../utils/permissions'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import ErrorBoundary from '../../components/shared/ErrorBoundary'
import { formatCurrency, formatDate } from '../../utils/formatters'

const PAYMENT_LABELS = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online',
}
const PAYMENT_ICONS = {
  cash: Banknote, card: CreditCard, bank_transfer: CreditCard, online: CreditCard,
}
const STATUS_LABELS = {
  completed: 'Completed', cancelled: 'Cancelled', draft: 'Draft',
}
const STATUS_COLORS = {
  completed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  draft: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

const EMPTY_RETURN = { quantity: '', reason: '' }

const Sales = () => {
  const { user, profile } = useAuth()
  const { can, role } = useRBAC()

  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const [viewTarget, setViewTarget] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN)
  const [returning, setReturning] = useState(false)

  const [message, setMessage] = useState(null)

  const notify = useCallback((type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = dateFrom || null
      const to = dateTo ? `${dateTo}T23:59:59` : null
      const data = await salesService.getAll({ from, to, limit: 500 })
      setSales(data || [])
    } catch (err) {
      setError(err.message || 'Could not load sales.')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  React.useEffect(() => { load() }, [load])

  const defaultMonthStart = React.useMemo(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  }, [])

  React.useEffect(() => {
    if (!dateFrom) setDateFrom(defaultMonthStart)
  }, [defaultMonthStart, dateFrom])

  const filtered = useMemo(() => {
    let list = sales
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(sale =>
        (sale.invoice_number || '').toLowerCase().includes(s) ||
        (sale.customers?.full_name || '').toLowerCase().includes(s)
      )
    }
    return list
  }, [sales, search])

  const totals = useMemo(() => {
    let rev = 0, cost = 0, profit = 0
    for (const s of filtered) {
      rev += parseFloat(s.total || 0)
      cost += parseFloat(s.total_cost || 0)
      profit += parseFloat(s.total || 0) - parseFloat(s.total_cost || 0)
    }
    return { revenue: rev, cost, profit, orders: filtered.length }
  }, [filtered])

  const handleViewItems = (sale) => setViewTarget(sale)
  const handleOpenReturn = (sale, item) => {
    setReturnTarget({ sale, item })
    setReturnForm({ quantity: String(item.quantity), reason: '' })
  }

  const handleProcessReturn = async (e) => {
    e.preventDefault()
    if (!returnTarget) return
    const qty = parseInt(returnForm.quantity, 10)
    const reason = returnForm.reason.trim()
    if (!qty || qty <= 0) return notify('error', 'Enter a valid return quantity.')
    const { sale, item } = returnTarget
    if (qty > item.quantity) return notify('error', `Cannot return more than ${item.quantity}.`)

    setReturning(true)
    try {
      await salesService.processReturn({
        saleId: sale.id,
        saleItemId: item.id,
        quantity: qty,
        reason,
        createdBy: user?.id,
      })
      notify('success', `Returned ${qty} × ${item.products?.name || 'item'}. Stock restored.`)
      setReturnTarget(null)
      setViewTarget(null)
      setReturnForm(EMPTY_RETURN)
      await load()
    } catch (err) {
      notify('error', err.message || 'Return failed.')
    } finally {
      setReturning(false)
    }
  }

  const handleRetry = () => load()

  if (loading && sales.length === 0) {
    return <Loader fullPage label="Loading sales…" />
  }

  return (
      <ErrorBoundary>
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">
            View monthly sales, invoices, costs and the items bought in each sale.
            Returns restore raw-material stock automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={load}
            title="Refresh"
          >
            Refresh
          </Button>
          {can(P.CREATE_SALES) && (
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => window.location.assign('/pos')}>
              New Sale (POS)
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {message.type === 'error' ? <AlertTriangle size={14} /> : <Check size={14} />}
          {message.text}
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {error}
          <button onClick={handleRetry} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}

      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16,
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            className="input-base"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice / customer…"
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <StatCard label="Total Sales" value={formatCurrency(totals.revenue)} icon={Receipt} color="#f97316" />
        <StatCard label="Orders" value={totals.orders} icon={FileText} color="#2563eb" />
        <StatCard label="Cost of Goods" value={formatCurrency(totals.cost)} icon={Banknote} color="#6b7280" />
        <StatCard label="Gross Profit" value={formatCurrency(totals.profit)} icon={Check} color="#16a34a" />
      </div>

      <div style={{ border: '1px solid var(--card-border)', borderRadius: 12, background: 'var(--card-bg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Invoice</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Cashier</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Payment</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Cost</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No sales found for the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map(sale => {
                if (!sale) return null
                const st = STATUS_COLORS[sale.sale_status] || STATUS_COLORS.completed
                const payIcon = PAYMENT_ICONS[sale.payment_method] || Receipt
                return (
                  <tr key={sale.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.1s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontSize: 12.5 }}>
                      {sale.invoice_number || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {sale?.created_at ? formatDate(new Date(sale.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {sale.customers?.full_name || 'Walk-in'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {sale.users?.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                      <payIcon size={12} color="var(--text-muted)" /> {PAYMENT_LABELS[sale?.payment_method] || sale?.payment_method || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                      {formatCurrency(sale.total || 0)}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      {formatCurrency(sale.total_cost || 0)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase',
                      }}>
                        {STATUS_LABELS[sale.sale_status] || sale.sale_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button
                          variant="ghost" size="sm" icon={<FileText size={12} />}
                          onClick={() => handleViewItems(sale)}
                          title="View items"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

{viewTarget && (
        <Modal
          open={!!viewTarget}
          onClose={() => setViewTarget(null)}
          title={`Items — #{viewTarget?.invoice_number}`}
          width={640}
        >
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            {viewTarget?.created_at ? formatDate(new Date(viewTarget.created_at), 'dd MMM yyyy, h:mm aa') : '—'} &nbsp;•&nbsp;
            {viewTarget.users?.full_name || '—'} &nbsp;•&nbsp;
            {PAYMENT_LABELS[viewTarget?.payment_method] || viewTarget?.payment_method || '—'}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Item</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Qty</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Unit Price</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Cost</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Return</th>
              </tr>
            </thead>
            <tbody>
              {(viewTarget.sale_items || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '10px 8px', fontSize: 12.5 }}>{item.products?.name || 'Item'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12.5 }}>{item.quantity}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12.5 }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12.5 }}>{formatCurrency(item.total_price)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatCurrency(item.total_cost || 0)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {viewTarget.sale_status === 'completed' && (
                      <Button
                        variant="danger" size="sm" icon={<Trash2 size={11} />}
                        onClick={() => handleOpenReturn(viewTarget, item)}
                        title="Process return"
                        disabled={returning}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', fontWeight: 700, fontSize: 14 }}>
            Total: {formatCurrency(viewTarget?.total)}
          </div>
        </div>
        <footer>
          <Button variant="secondary" onClick={() => setViewTarget(null)}>Close</Button>
        </footer>
      </Modal>
      )}
      
      <Modal
        open={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        title={`Return Item — #{(returnTarget?.sale?.invoice_number)}`}
        width={520}
      >
        <form onSubmit={handleProcessReturn}>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              {returnTarget?.item?.products?.name || 'Item'}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{` — Qty ${returnTarget?.item?.quantity}`}</span>
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Quantity to return</label>
              <input
                className="input-base"
                type="number"
                min="1"
                value={returnForm.quantity}
                onChange={e => setReturnForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Qty"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Reason</label>
              <input
                className="input-base"
                value={returnForm.reason}
                onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Damaged, Wrong item, Customer request"
              />
            </div>

            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 0 }}>
              Returning stock adds the raw materials back to inventory automatically.
            </p>
          </div>
          <footer>
            <Button variant="secondary" type="button" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="danger" type="submit" loading={returning} disabled={returning}>Process Return</Button>
          </footer>
        </form>
      </Modal>
    </div>
      </ErrorBoundary>
  )
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div style={{
    padding: '14px 16px', borderRadius: 10, border: '1px solid var(--card-border)',
    background: 'var(--card-bg)', display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}15`, color,
    }}>
      <Icon size={14} />
    </div>
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{value}</div>
    </div>
  </div>
)

export default Sales

