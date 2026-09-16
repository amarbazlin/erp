import React, { useState } from 'react'
import {
  MessageCircle, Send, CheckCircle, XCircle,
  AlertTriangle, Phone, Package, ChevronDown,
  ChevronUp, Clock, Loader2, Eye, X
} from 'lucide-react'
import { sendAllReorders, sendReorderToSupplier, getAppUrl } from '../../services/whatsappService'
import { formatCurrencyShort } from '../../utils/formatters'
import Loader from '../shared/Loader'

// ── Supplier order card ───────────────────────────────────────────────────────

const SupplierCard = ({ group, onSendSingle, sending, sent, failed }) => {
  const [expanded, setExpanded] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const borderColor = sent    ? '#bbf7d0'
    : failed  ? '#fecaca'
    : group.hasPhone ? 'var(--card-border)' : '#fde68a'

  const bgColor = sent    ? '#f0fdf4'
    : failed  ? '#fef2f2'
    : 'var(--card-bg)'

  // Build message preview
  const previewText = group.items.map((item, i) =>
    `${i + 1}. ${item.product_name}\n   Qty: ${item.suggested_qty} ${item.unit || 'pcs'}\n   Rs. ${Number(item.buying_price || 0).toFixed(2)}/unit`
  ).join('\n\n')

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`,
      borderRadius: 12,
      background: bgColor,
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Status indicator */}
        <div style={{ flexShrink: 0 }}>
          {sent ? (
            <CheckCircle size={20} color="#16a34a" />
          ) : failed ? (
            <XCircle size={20} color="#dc2626" />
          ) : sending ? (
            <Loader size={18} color="#f97316" />
          ) : (
            <div style={{
              width: 20, height: 20, borderRadius: 99,
              border: '2px solid var(--card-border)',
              background: 'var(--content-bg)',
            }} />
          )}
        </div>

        {/* Supplier info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {group.supplier.supplier_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
            {group.supplier.phone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <Phone size={11} />
                {group.supplier.phone}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                <AlertTriangle size={11} />
                No phone number — cannot send WhatsApp
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Est. {formatCurrencyShort(group.estimatedTotal)}
            </span>
          </div>
          {sent && (
            <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, marginTop: 3 }}>
              ✓ WhatsApp sent successfully
            </div>
          )}
          {failed && (
            <div style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600, marginTop: 3 }}>
              ✗ {failed}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Preview button */}
          <button
            onClick={() => setPreviewOpen(p => !p)}
            title="Preview message"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 7,
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              cursor: 'pointer', fontSize: 11.5,
              color: 'var(--text-secondary)', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <Eye size={12} />
            Preview
          </button>

          {/* Send individual */}
          {!sent && !failed && (
            <button
              onClick={() => onSendSingle(group)}
              disabled={!group.hasPhone || sending}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7,
                border: `1px solid ${group.hasPhone ? '#fed7aa' : 'var(--card-border)'}`,
                background: group.hasPhone ? '#fff7ed' : 'var(--content-bg)',
                cursor: group.hasPhone && !sending ? 'pointer' : 'not-allowed',
                fontSize: 11.5, color: group.hasPhone ? '#f97316' : 'var(--text-muted)',
                fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                opacity: sending ? 0.6 : 1,
              }}
            >
              <MessageCircle size={12} />
              Send
            </button>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            {expanded
              ? <ChevronUp size={16} color="var(--text-muted)" />
              : <ChevronDown size={16} color="var(--text-muted)" />
            }
          </button>
        </div>
      </div>

      {/* Expanded: item list */}
      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--card-border)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 4, marginBottom: 6 }}>
            {['Product', 'Current', 'Reorder', 'Order Qty'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>{h}</span>
            ))}
          </div>
          {group.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 4, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.product_code}</div>
              </div>
              <span style={{ fontSize: 12.5, color: item.current_stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                {item.current_stock}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.reorder_level}</span>
              <span style={{ fontSize: 12.5, color: '#f97316', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                {item.suggested_qty} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Message preview panel */}
      {previewOpen && (
        <div style={{ padding: '12px 18px 14px', borderTop: '1px solid var(--card-border)', background: '#0d1117' }}>
          <div style={{ fontSize: 10.5, color: '#4b5563', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em' }}>
            WHATSAPP MESSAGE PREVIEW
          </div>
          <pre style={{
            fontSize: 12, color: '#9ca3af', lineHeight: 1.8,
            whiteSpace: 'pre-wrap', fontFamily: 'DM Sans, sans-serif',
            background: '#161b22', border: '1px solid #1e2530',
            borderRadius: 8, padding: '12px 14px', margin: 0,
          }}>
            {`Hello ${group.supplier.supplier_name},\n\nThis is a purchase order request from [Your Business].\n\n${previewText}\n\nEst. total: ${formatCurrencyShort(group.estimatedTotal)}\n\nView orders: ${getAppUrl()}/purchases\n\nKindly confirm availability and expected delivery date.`}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const ReorderNotificationModal = ({ open, supplierGroups = [], loading, onDismiss }) => {
  const [sending,     setSending]     = useState(false)
  const [progress,    setProgress]    = useState(null)   // { current, total, supplier }
  const [results,     setResults]     = useState(null)   // { sent, failed, skipped }
  const [sentIds,     setSentIds]     = useState({})     // { supplierId: true }
  const [failedIds,   setFailedIds]   = useState({})     // { supplierId: 'error message' }

  if (!open) return null

  const withPhone    = supplierGroups.filter(g => g.hasPhone)
  const withoutPhone = supplierGroups.filter(g => !g.hasPhone)
  const totalItems   = supplierGroups.reduce((s, g) => s + g.items.length, 0)
  const totalValue   = supplierGroups.reduce((s, g) => s + g.estimatedTotal, 0)
  const allDone      = results !== null

  // Send to all suppliers
  const handleSendAll = async () => {
    setSending(true)
    setResults(null)
    setProgress({ current: 0, total: withPhone.length, supplier: '' })

    try {
      const res = await sendAllReorders(withPhone, (p) => setProgress(p))
      setResults(res)

      // Mark sent / failed
      const newSent   = {}
      const newFailed = {}
      res.sent.forEach(r => {
        const g = supplierGroups.find(g => g.supplier.supplier_name === r.supplier)
        if (g) newSent[g.supplier.id] = true
      })
      res.failed.forEach(r => {
        const g = supplierGroups.find(g => g.supplier.supplier_name === r.supplier)
        if (g) newFailed[g.supplier.id] = r.reason
      })
      setSentIds(newSent)
      setFailedIds(newFailed)
    } finally {
      setSending(false)
      setProgress(null)
    }
  }

  // Send to single supplier
  const handleSendSingle = async (group) => {
    try {
      await sendReorderToSupplier({
        supplier: group.supplier,
        items: group.items,
        purchaseUrl: `${getAppUrl()}/purchases`,
      })
      setSentIds(prev => ({ ...prev, [group.supplier.id]: true }))
    } catch (err) {
      setFailedIds(prev => ({ ...prev, [group.supplier.id]: err.message }))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(13,17,23,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 20,
        width: '100%', maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        border: '1px solid var(--card-border)',
        animation: 'slideIn 0.25s ease',
        overflow: 'hidden',
      }}>

        {/* ── Modal Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle size={22} color="#f97316" />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff' }}>
                End-of-Day Reorder Check
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Clock size={12} color="#6b7280" />
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {supplierGroups.length} supplier{supplierGroups.length !== 1 ? 's' : ''} need orders
                  {' · '}
                  {totalItems} items
                  {' · '}
                  Est. {formatCurrencyShort(totalValue)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        {/* ── Warning for suppliers with no phone ── */}
        {withoutPhone.length > 0 && (
          <div style={{ padding: '10px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#92400e' }}>
              <AlertTriangle size={14} />
              <span>
                <strong>{withoutPhone.length} supplier{withoutPhone.length !== 1 ? 's have' : ' has'} no phone number</strong> — go to Suppliers page to add them.
              </span>
            </div>
          </div>
        )}

        {/* ── Supplier list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader size={36} /></div>
          ) : supplierGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <CheckCircle size={40} strokeWidth={1.5} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>All stocked up!</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No products are below their reorder level.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supplierGroups.map(group => (
                <SupplierCard
                  key={group.supplier.id}
                  group={group}
                  onSendSingle={handleSendSingle}
                  sending={sending}
                  sent={sentIds[group.supplier.id]}
                  failed={failedIds[group.supplier.id]}
                />
              ))}
            </div>
          )}

          {/* ── Progress bar while sending ── */}
          {sending && progress && (
            <div style={{ marginTop: 16, padding: '14px 18px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#92400e', marginBottom: 8 }}>
                <span>Sending to <strong>{progress.supplier}</strong>…</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ height: 6, background: '#fde68a', borderRadius: 99 }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: '#f97316',
                  width: `${(progress.current / progress.total) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* ── Results summary ── */}
          {results && (
            <div style={{ marginTop: 16, padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>
                Orders Dispatched
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>✅ Sent: </span>
                  <strong style={{ color: 'var(--success)', fontFamily: 'Outfit, sans-serif' }}>{results.sent.length}</strong>
                </div>
                {results.failed.length > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>❌ Failed: </span>
                    <strong style={{ color: 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>{results.failed.length}</strong>
                  </div>
                )}
                {results.skipped.length > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>⏭ Skipped: </span>
                    <strong style={{ color: 'var(--warning)', fontFamily: 'Outfit, sans-serif' }}>{results.skipped.length}</strong>
                  </div>
                )}
              </div>
              {results.failed.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {results.failed.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                      • {f.supplier}: {f.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--card-bg)',
        }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {allDone ? 'Close' : 'Dismiss for today'}
          </button>

          {!allDone && withPhone.length > 0 && (
            <button
              onClick={handleSendAll}
              disabled={sending}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 24px', borderRadius: 10,
                background: sending ? '#9ca3af' : 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', border: 'none',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Outfit, sans-serif',
                boxShadow: sending ? 'none' : '0 4px 16px rgba(37,211,102,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {sending ? (
                <><Loader size={16} color="#fff" /> Sending…</>
              ) : (
                <><Send size={16} /> Send Orders to {withPhone.length} Supplier{withPhone.length !== 1 ? 's' : ''}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReorderNotificationModal
