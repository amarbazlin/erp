import React, { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, CheckCircle, XCircle, AlertTriangle,
  Package, Sparkles, RefreshCw, History, Bell,
  ShieldAlert, Info, Send, ChevronDown, ChevronUp,
  Clock, Truck, Check, X
} from 'lucide-react'
import { productService } from '../../services/productService'
import { alertsService } from '../../services/alertsService'
import { reorderService } from '../../services/reorderService'
import { getReorderRecommendations } from '../../services/aiService'
import { sendReorderToSupplier, getAppUrl } from '../../services/whatsappService'
import { useAuth } from '../../context/AuthContext'
import { useRBAC } from '../../context/RBACContext'
import { P, ROLES } from '../../utils/permissions'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import Modal from '../../components/shared/Modal'
import { formatCurrency, formatCurrencyShort, formatRelative } from '../../utils/formatters'
import { calcMargin } from '../../utils/calculations'

// ── Severity config for alerts ─────────────────────────────────────────────────
const SEV = {
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: ShieldAlert },
  high:     { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: AlertTriangle },
  medium:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle },
  low:      { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Info },
}

// ── Order status badge ─────────────────────────────────────────────────────────
const OrderStatusBadge = ({ status }) => {
  const cfg = {
    pending:  { label: 'Pending',      bg: '#f3f4f6', color: '#6b7280'  },
    sent:     { label: 'Order Placed', bg: '#f0fdf4', color: '#16a34a'  },
    received: { label: 'Received',     bg: '#eff6ff', color: '#2563eb'  },
  }[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: 11.5, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
      whiteSpace: 'nowrap',
    }}>
      {status === 'sent' && <Check size={11} strokeWidth={3} />}
      {status === 'pending' && <Clock size={11} />}
      {cfg.label}
    </span>
  )
}

// ── Alert summary bar ──────────────────────────────────────────────────────────
const AlertSummaryBar = ({ alerts, onResolve, onResolveAll }) => {
  const [expanded, setExpanded] = useState(true)

  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high:     alerts.filter(a => a.severity === 'high').length,
    medium:   alerts.filter(a => a.severity === 'medium').length,
    low:      alerts.filter(a => a.severity === 'low').length,
  }

  if (alerts.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', background: '#f0fdf4',
        border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 20,
      }}>
        <CheckCircle size={18} color="#16a34a" />
        <span style={{ fontSize: 13.5, color: '#15803d', fontWeight: 500 }}>
          All clear — no active alerts
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2530',
      borderRadius: 14, marginBottom: 20, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bell size={16} color="#f97316" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            {Object.entries(counts).filter(([, v]) => v > 0).map(([sev, count]) => (
              <span key={sev} style={{
                fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
                background: SEV[sev]?.bg, color: SEV[sev]?.color,
                fontFamily: 'Outfit, sans-serif',
              }}>
                {count} {sev}
              </span>
            ))}
          </div>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onResolveAll() }}
            style={{ fontSize: 12, color: '#4b5563', background: 'rgba(255,255,255,0.06)', border: '1px solid #374151', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          >
            Resolve all
          </button>
        )}
        {expanded
          ? <ChevronUp size={15} color="#6b7280" />
          : <ChevronDown size={15} color="#6b7280" />
        }
      </div>

      {/* Alert list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1e2530' }}>
          {alerts.map(alert => {
            const cfg = SEV[alert.severity] || SEV.medium
            const Icon = cfg.icon
            return (
              <div key={alert.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '11px 18px', borderBottom: '1px solid #161b22',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={13} color={cfg.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#d1d5db', margin: '0 0 2px', lineHeight: 1.5 }}>{alert.message}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{formatRelative(alert.created_at)}</p>
                </div>
                <button
                  onClick={() => onResolve(alert.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, flexShrink: 0, marginTop: 2 }}
                  title="Resolve"
                >
                  <X size={13} color="#4b5563" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Receive modal — confirm qty and mark received ──────────────────────────────
const ReceiveModal = ({ open, order, product, onConfirm, onClose }) => {
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setQty(String(order?.quantity || ''))
  }, [open, order])

  const handleConfirm = async () => {
    const q = parseInt(qty)
    if (!q || q < 1) return alert('Enter a valid quantity')
    setLoading(true)
    try {
      await onConfirm(q)
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Stock Received"
      width={400}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} icon={<CheckCircle />} onClick={handleConfirm}>
            Confirm Received
          </Button>
        </>
      }
    >
      <div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 3 }}>
            {product?.product_name}
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7280' }}>
            Supplier: {order?.suppliers?.supplier_name || '—'} · Ordered: {order?.quantity} {product?.unit}
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Quantity received ({product?.unit})</label>
          <input
            className="input-base"
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(e.target.value)}
            autoFocus
          />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            This will be added to current stock and the product removed from the reorder list.
          </span>
        </div>
      </div>
    </Modal>
  )
}

// ── AI recommendations panel ───────────────────────────────────────────────────
const AIPanel = ({ insight, loading }) => (
  <div style={{
    background: 'linear-gradient(135deg, #0d1117, #1a1f2e)',
    border: '1px solid #1e2530', borderRadius: 14, padding: '18px 22px',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 99, background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={13} color="#f97316" />
      </div>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>
        AI Prioritised Recommendations
      </span>
      <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', padding: '1px 7px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto' }}>
        ForgeraOS
      </span>
    </div>
    {loading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[80, 100, 65, 90].map((w, i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    ) : insight ? (
      <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line', fontFamily: 'DM Sans, sans-serif' }}>
        {insight}
      </p>
    ) : (
      <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontStyle: 'italic' }}>
        Click "Generate AI Analysis" below to get prioritised reorder recommendations.
      </p>
    )}
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const SmartRecommendations = () => {
  const { user }         = useAuth()
  const { can, hasRole } = useRBAC()

  const canSendOrders = can(P.MANAGE_INVENTORY) || hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER, ROLES.BRANCH_MANAGER, ROLES.PROCUREMENT_OFFICER)

  // ── Data state ────────────────────────────────────────────────────────────
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [activeOrders,     setActiveOrders]     = useState([])   // existing reorder_orders rows
  const [alerts,           setAlerts]           = useState([])
  const [loadingData,      setLoadingData]       = useState(true)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sendingId,    setSendingId]    = useState(null)   // product id currently being sent
  const [receiveModal, setReceiveModal] = useState(null)   // { order, product }
  const [aiInsight,    setAiInsight]    = useState('')
  const [loadingAI,    setLoadingAI]    = useState(false)
  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [history,      setHistory]      = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingAll,   setSendingAll]   = useState(false)
  const [sendAllProgress, setSendAllProgress] = useState(null)
  const [sendAllResults,  setSendAllResults]  = useState(null)

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [lowStock, orders, alertData] = await Promise.all([
        productService.getBelowReorder(),
        reorderService.getActive(),
        alertsService.getAll({ resolved: false }),
      ])
      setLowStockProducts(lowStock || [])
      setActiveOrders(orders || [])
      setAlerts(alertData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Per-product order lookup ──────────────────────────────────────────────
  const getOrderForProduct = (productId) =>
    activeOrders.find(o => o.product_id === productId) || null

  // ── Send order for single product ─────────────────────────────────────────
  const handleSendOrder = async (product) => {
    if (!product.suppliers?.phone) {
      alert(`${product.suppliers?.supplier_name || 'Supplier'} has no phone number. Go to Suppliers and add their WhatsApp number first.`)
      return
    }

    setSendingId(product.id)
    try {
      const deficit      = Math.max(0, product.reorder_level - product.quantity)
      const suggestedQty = Math.max(deficit, product.reorder_level)

      // 1. Create order record
      const order = await reorderService.create({
        productId:  product.id,
        supplierId: product.supplier_id,
        quantity:   suggestedQty,
        createdBy:  user?.id,
        notes:      `Auto-generated from Smart Reorder`,
      })

      // 2. Send WhatsApp message
      await sendReorderToSupplier({
        supplier: product.suppliers,
        items: [{
          product_name:  product.product_name,
          product_code:  product.product_code,
          unit:          product.unit,
          current_stock: product.quantity,
          reorder_level: product.reorder_level,
          suggested_qty: suggestedQty,
          buying_price:  product.buying_price,
        }],
        purchaseUrl: `${getAppUrl()}/purchases`,
      })

      // 3. Mark as sent
      await reorderService.markSent(order.id)

      // 4. Reload
      await loadData()
    } catch (err) {
      alert(`Failed to send order: ${err.message}`)
    } finally {
      setSendingId(null)
    }
  }

  // ── Mark received ─────────────────────────────────────────────────────────
  const handleMarkReceived = async (qtyReceived) => {
    const { order } = receiveModal
    await reorderService.markReceived(order.id, qtyReceived)
    setReceiveModal(null)
    await loadData()
  }

  // ── Cancel order ──────────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId) => {
    if (!confirm('Cancel this reorder? The product will return to pending status.')) return
    await reorderService.cancel(orderId)
    await loadData()
  }

  // ── Send all pending ──────────────────────────────────────────────────────
  const handleSendAll = async () => {
    const pending = lowStockProducts.filter(p => !getOrderForProduct(p.id) && p.suppliers?.phone)
    if (pending.length === 0) {
      alert('No pending products with a valid supplier phone number.')
      return
    }
    setSendingAll(true)
    setSendAllResults(null)
    const results = { sent: [], failed: [], skipped: [] }

    for (let i = 0; i < pending.length; i++) {
      const p = pending[i]
      setSendAllProgress({ current: i + 1, total: pending.length, name: p.product_name })
      try {
        await handleSendOrder(p)
        results.sent.push(p.product_name)
      } catch (err) {
        results.failed.push({ name: p.product_name, reason: err.message })
      }
      if (i < pending.length - 1) await new Promise(r => setTimeout(r, 600))
    }

    setSendAllProgress(null)
    setSendAllResults(results)
    setSendingAll(false)
    await loadData()
  }

  // ── Alert resolution ──────────────────────────────────────────────────────
  const handleResolveAlert = async (alertId) => {
    await alertsService.resolve(alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const handleResolveAllAlerts = async () => {
    await alertsService.resolveAll()
    setAlerts([])
  }

  // ── AI analysis ───────────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    if (lowStockProducts.length === 0) return
    setLoadingAI(true)
    setAiInsight('')
    try {
      const text = await getReorderRecommendations(lowStockProducts)
      setAiInsight(text)
    } catch (err) {
      setAiInsight('Unable to generate recommendations. Check your API configuration.')
    } finally {
      setLoadingAI(false)
    }
  }

  // ── History ────────────────────────────────────────────────────────────────
  const handleOpenHistory = async () => {
    setHistoryOpen(true)
    setLoadingHistory(true)
    try {
      const data = await reorderService.getHistory()
      setHistory(data)
    } catch (err) { console.error(err) }
    finally { setLoadingHistory(false) }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pendingCount   = lowStockProducts.filter(p => !getOrderForProduct(p.id)).length
  const placedCount    = activeOrders.filter(o => o.status === 'sent').length
  const noPhoneCount   = lowStockProducts.filter(p => !p.suppliers?.phone).length
  const totalValue     = lowStockProducts.reduce((s, p) => {
    const qty = Math.max(0, p.reorder_level - p.quantity)
    return s + qty * (p.buying_price || 0)
  }, 0)

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#ea6c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={15} color="#fff" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Smart Reorder</h1>
          </div>
          <p className="page-subtitle">
            {pendingCount} pending · {placedCount} orders placed · est. {formatCurrencyShort(totalValue)} reorder value
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon={<History />} onClick={handleOpenHistory}>
            History
          </Button>
          {canSendOrders && pendingCount > 0 && (
            <Button
              icon={sendingAll ? undefined : <Send />}
              loading={sendingAll}
              size="sm"
              onClick={handleSendAll}
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              {sendingAll
                ? sendAllProgress
                  ? `Sending ${sendAllProgress.current}/${sendAllProgress.total}…`
                  : 'Sending…'
                : `Send All Pending (${pendingCount})`
              }
            </Button>
          )}
        </div>
      </div>

      {/* ── Send All results ── */}
      {sendAllResults && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 20, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color: '#15803d' }}>
              Batch complete — {sendAllResults.sent.length} sent, {sendAllResults.failed.length} failed
            </div>
            <button onClick={() => setSendAllResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
              <X size={15} />
            </button>
          </div>
          {sendAllResults.failed.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {sendAllResults.failed.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>✗ {f.name}: {f.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Needs Ordering',   value: pendingCount,  color: '#ef4444' },
          { label: 'Orders Placed',    value: placedCount,   color: '#22c55e' },
          { label: 'No Phone Number',  value: noPhoneCount,  color: '#f59e0b' },
          { label: 'Active Alerts',    value: alerts.length, color: '#f97316' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert summary bar ── */}
      <AlertSummaryBar
        alerts={alerts}
        onResolve={handleResolveAlert}
        onResolveAll={handleResolveAllAlerts}
      />

      {/* ── Reorder products table ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>
              Products Requiring Reorder
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} at or below reorder level
            </p>
          </div>
          <button
            onClick={loadData}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 6 }}
            title="Refresh"
          >
            <RefreshCw size={15} color="var(--text-muted)" />
          </button>
        </div>

        {loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader size={32} /></div>
        ) : lowStockProducts.length === 0 ? (
          <div className="empty-state" style={{ padding: 56 }}>
            <CheckCircle size={40} strokeWidth={1.5} color="var(--success)" />
            <h3 style={{ color: 'var(--success)' }}>All stocked up!</h3>
            <p>No products are below their reorder level right now.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock / Level</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Order Qty</th>
                  <th style={{ textAlign: 'right' }}>Est. Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(product => {
                  const order         = getOrderForProduct(product.id)
                  const deficit       = Math.max(0, product.reorder_level - product.quantity)
                  const suggestedQty  = Math.max(deficit, product.reorder_level)
                  const estCost       = suggestedQty * (product.buying_price || 0)
                  const hasPhone      = Boolean(product.suppliers?.phone)
                  const isSending     = sendingId === product.id

                  return (
                    <tr key={product.id} style={{
                      background: product.quantity === 0
                        ? 'rgba(220,38,38,0.03)'
                        : order?.status === 'sent'
                          ? 'rgba(22,163,74,0.03)'
                          : 'transparent',
                    }}>
                      {/* Product */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{product.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{product.product_code}</div>
                      </td>

                      {/* Stock */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 17,
                              color: product.quantity === 0 ? '#dc2626' : '#f97316',
                            }}>
                              {product.quantity}
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                              / min {product.reorder_level} {product.unit}
                            </span>
                          </div>
                          <StockStatusBadge quantity={product.quantity} reorderLevel={product.reorder_level} />
                        </div>
                      </td>

                      {/* Supplier */}
                      <td>
                        {product.suppliers ? (
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
                              {product.suppliers.supplier_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, marginTop: 2 }}>
                              {hasPhone ? (
                                <span style={{ color: '#25D366', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MessageCircle size={11} /> WhatsApp ready
                                </span>
                              ) : (
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <AlertTriangle size={11} /> No phone number
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No supplier assigned</span>
                        )}
                      </td>

                      {/* Order qty */}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          {order?.quantity || suggestedQty}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{product.unit}</div>
                      </td>

                      {/* Est. cost */}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                          {formatCurrencyShort(estCost)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        {order ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <OrderStatusBadge status={order.status} />
                            {order.status === 'sent' && order.whatsapp_sent_at && (
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                {formatRelative(order.whatsapp_sent_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <OrderStatusBadge status="pending" />
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {!order && canSendOrders && (
                            <button
                              onClick={() => handleSendOrder(product)}
                              disabled={!hasPhone || isSending}
                              title={!hasPhone ? 'Add supplier phone number first' : 'Send WhatsApp order to supplier'}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 8,
                                border: `1px solid ${hasPhone ? '#bbf7d0' : 'var(--card-border)'}`,
                                background: hasPhone ? '#f0fdf4' : 'var(--content-bg)',
                                color: hasPhone ? '#16a34a' : 'var(--text-muted)',
                                fontSize: 12, fontWeight: 600, cursor: hasPhone && !isSending ? 'pointer' : 'not-allowed',
                                opacity: isSending ? 0.6 : 1,
                                fontFamily: 'DM Sans, sans-serif',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isSending
                                ? <Loader size={12} color="#16a34a" />
                                : <MessageCircle size={13} />
                              }
                              {isSending ? 'Sending…' : 'Send Order'}
                            </button>
                          )}

                          {order?.status === 'sent' && canSendOrders && (
                            <>
                              <button
                                onClick={() => setReceiveModal({ order, product })}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '6px 12px', borderRadius: 8,
                                  border: '1px solid #bfdbfe', background: '#eff6ff',
                                  color: '#2563eb', fontSize: 12, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                                }}
                              >
                                <Truck size={13} /> Received
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Cancel order"
                              >
                                <X size={12} color="#dc2626" />
                              </button>
                            </>
                          )}

                          {!canSendOrders && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No permission
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── AI Recommendations section ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
            AI Analysis
          </h3>
          <Button
            size="sm"
            icon={<Sparkles />}
            loading={loadingAI}
            onClick={handleGenerateAI}
            disabled={lowStockProducts.length === 0}
          >
            {aiInsight ? 'Regenerate' : 'Generate AI Analysis'}
          </Button>
        </div>
        <AIPanel insight={aiInsight} loading={loadingAI} />
      </div>

      {/* ── Receive confirmation modal ── */}
      {receiveModal && (
        <ReceiveModal
          open={!!receiveModal}
          order={receiveModal.order}
          product={receiveModal.product}
          onConfirm={handleMarkReceived}
          onClose={() => setReceiveModal(null)}
        />
      )}

      {/* ── History modal ── */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Reorder History"
        width={620}
      >
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader /></div>
        ) : history.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <History size={32} strokeWidth={1.5} />
            <p>No completed reorders yet</p>
          </div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Product</th><th>Supplier</th><th>Qty</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{h.products?.product_name}</td>
                    <td style={{ fontSize: 12.5 }}>{h.suppliers?.supplier_name || '—'}</td>
                    <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>{h.qty_received || h.quantity}</td>
                    <td><OrderStatusBadge status={h.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatRelative(h.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SmartRecommendations