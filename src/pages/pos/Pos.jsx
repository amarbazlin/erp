import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, Search, Check, Printer, X } from 'lucide-react'
import { usePosProducts } from '../../hooks/useProducts'
import { salesService, createPosSale } from '../../services/salesService'
import { useAuth } from '../../context/AuthContext'
import { customerService } from '../../services/customerService'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'

const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online' }
const PRODUCT_IMAGE_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><text x="40" y="48" font-size="30" text-anchor="middle">🍰</text></svg>`
)

const qtyBtn = {
  width: 24, height: 24, borderRadius: 6, border: '1px solid var(--card-border)',
  background: 'var(--content-bg)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0,
}

const Pos = () => {
    const { user, profile } = useAuth()
  const { products, loading, refetch } = usePosProducts()

  const [search,        setSearch]        = useState('')
  const [cart,          setCart]          = useState([])   // { product, quantity }
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount,      setDiscount]      = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [receipt,       setReceipt]       = useState(null)
  const [error,         setError]         = useState(null)
  const autoPrintedReceipt = useRef(null)

  // Print only after the saved receipt is mounted. Stock refreshes must not
  // unmount it or cause duplicate print dialogs; manual reprinting stays available.
  useEffect(() => {
    if (!receipt || autoPrintedReceipt.current === receipt) return
    const timer = window.setTimeout(() => {
      if (!document.getElementById('pos-receipt')) return
      autoPrintedReceipt.current = receipt
      window.print()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [receipt])

  const filtered = useMemo(() => {
    let list = products
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
    }
    return list
  }, [products, search])

  const subtotal = cart.reduce((s, c) => s + c.product.selling_price * c.quantity, 0)
  const discountValue = Math.min(Math.max(parseFloat(discount) || 0, 0), subtotal)
  const total = subtotal - discountValue

  const addToCart = (product) => {
    setError(null)
    setCart(prev => {
      const idx = prev.findIndex(c => c.product.id === product.id)
      const max = Math.floor(product.available_stock || 0)
      if (idx >= 0) {
        if (prev[idx].quantity >= max) return prev   // never exceed available stock
        return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c)
      }
      if (max <= 0) return prev                      // out of stock
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart(prev => prev
      .map(c => {
        if (c.product.id !== id) return c
        const max = Math.floor(c.product.available_stock || 0)
        return { ...c, quantity: Math.min(Math.max(c.quantity + delta, 0), max) }
      })
      .filter(c => c.quantity > 0)
    )
  }

  // ── Proceed: save the sale first (DB is the source of truth), then show the
  //    invoice preview with the real invoice number from the database. ──
  const handleProceed = async () => {
    if (cart.length === 0 || saving) return
    setSaving(true)
    setError(null)
    try {
      const items = cart.map(c => ({
        product_id: c.product.id,
        quantity:   c.quantity,
        unit_price: c.product.selling_price,
        unit_cost:  c.product.calculated_cost || 0,
      }))
      // Resolve (or auto-create) the customer from the entered phone number
      let resolvedCustomerId = null
      try {
        if (customerPhone.trim()) {
          const cust = await customerService.resolveByPhone(customerPhone)
          resolvedCustomerId = cust?.id || null
        }
      } catch (custErr) {
        console.error('Customer lookup failed:', custErr)
        // Sale still proceeds as walk-in if the lookup fails
      }
      const result = await createPosSale({
        items,
        paymentMethod,
        cashierId: profile?.id || user?.id,
        customerId: resolvedCustomerId,
        discount: discountValue,
      })
      const sale = result?.sale || result
      // Pull the full saved sale (cashier name, customer name, items) for the receipt
      let full = null
      try { full = await salesService.getById(sale.id) } catch { /* keep partial data */ }
      setReceipt({
        invoice_number: sale.invoice_number,
        created_at:     sale.created_at || new Date().toISOString(),
        cashier_name:   full?.users?.full_name || profile?.full_name || user?.email || 'Cashier',
        customer_name:  full?.customers?.full_name || null,
        payment_method: sale.payment_method || paymentMethod,
        subtotal:       full?.subtotal ?? subtotal,
        discount:       full?.discount ?? discountValue,
        total:          sale.total ?? total,
        items: (full?.sale_items?.length
          ? full.sale_items.map(si => ({
              name: si.products?.name || cart.find(c => c.product.id === si.product_id)?.product.name || 'Item',
              quantity: si.quantity,
              unit_price: parseFloat(si.unit_price),
              total_price: parseFloat(si.total_price),
            }))
          : cart.map(c => ({
              name: c.product.name,
              quantity: c.quantity,
              unit_price: c.product.selling_price,
              total_price: c.product.selling_price * c.quantity,
            }))
        ),
      })
            setCart([])
      setDiscount(0)
      setCustomerPhone('')
      refetch()
    } catch (err) {
      // Sale NOT saved — show the real error, keep the cart intact
      setError(err.message || 'Checkout failed. Please try again.')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  if (loading && !receipt) return <Loader fullPage label="Loading products…" />

  return (
    <div className="pos-root" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 90px)' }}>
      {/* ── RIGHT: Product grid ── */}
      <div className="pos-products" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-base" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}><ShoppingCart size={32} /><p>No products found</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
            {filtered.map(p => {
              const out = !p.in_stock || (p.available_stock || 0) <= 0
              const inCart = cart.find(c => c.product.id === p.id)
              const maxed = inCart && inCart.quantity >= Math.floor(p.available_stock || 0)
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{ padding: 12, position: 'relative', opacity: out ? 0.55 : 1, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {out && (
                    <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Out of Stock
                    </span>
                  )}
                  <div style={{ width: '100%', aspectRatio: '1 / 0.8', borderRadius: 8, overflow: 'hidden', background: 'var(--content-bg)' }}>
                    <img
                      src={p.image_url || PRODUCT_IMAGE_FALLBACK}
                      alt={p.name}
                      onError={e => { e.currentTarget.src = PRODUCT_IMAGE_FALLBACK }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13.5, marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{p.sku}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div>
                      <span style={{ display: 'block', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 15, color: '#f97316' }}>{formatCurrency(p.selling_price)}</span>
                      <span style={{ fontSize: 10.5, color: out ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {out ? 'Out of stock' : `${p.available_stock} in stock`}
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={out || maxed}
                      title={maxed ? 'No more stock available' : 'Add to cart'}
                      style={{
                        width: 34, height: 34, borderRadius: 9, border: 'none', cursor: out || maxed ? 'not-allowed' : 'pointer',
                        background: out || maxed ? 'var(--content-bg)' : '#f97316', color: out || maxed ? 'var(--text-muted)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── LEFT: Cart / order panel ── */}
      <div className="pos-cart" style={{ width: 350, flexShrink: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--card-border)', borderRadius: 12, background: 'var(--card-bg)' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Order ({cart.reduce((s, c) => s + c.quantity, 0)} items)
          </h3>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}
          {cart.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <ShoppingCart size={24} style={{ marginBottom: 8 }} />
              <p>No items in cart</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.map((c) => {
                const max = Math.floor(c.product.available_stock || 0)
                return (
                  <div key={c.product.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--content-bg)' }}>
                    <img
                      src={c.product.image_url || PRODUCT_IMAGE_FALLBACK}
                      alt={c.product.name}
                      onError={e => { e.currentTarget.src = PRODUCT_IMAGE_FALLBACK }}
                      style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.product.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatCurrency(c.product.selling_price)} each · {c.product.available_stock} in stock
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <button onClick={() => changeQty(c.product.id, -1)} style={{ ...qtyBtn, width: 22, height: 22 }}>
                          <Minus size={10} />
                        </button>
                        <span style={{ fontSize: 12, minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{c.quantity}</span>
                        <button
                          onClick={() => changeQty(c.product.id, 1)}
                          disabled={c.quantity >= max}
                          style={{ ...qtyBtn, width: 22, height: 22, opacity: c.quantity >= max ? 0.4 : 1, cursor: c.quantity >= max ? 'not-allowed' : 'pointer' }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>{formatCurrency(c.product.selling_price * c.quantity)}</span>
                      <button
                        onClick={() => setCart(prev => prev.filter(i => i.product.id !== c.product.id))}
                        title="Remove item"
                        style={{ ...qtyBtn, width: 22, height: 22, padding: 2, marginTop: 4, color: '#dc2626', marginLeft: 'auto' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Totals + checkout */}
        <div style={{ padding: 16, borderTop: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Subtotal</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input-base" type="number" min="0" step="0.01" placeholder="Discount (Rs.)" value={discount} onChange={e => setDiscount(e.target.value)} style={{ width: 120, fontSize: 12.5 }} />
          </div>
          {discountValue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: '#16a34a' }}>Discount</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>−{formatCurrency(discountValue)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#f97316', fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(total)}</span>
          </div>

          <select className="input-base" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', marginBottom: 12, fontSize: 12.5 }}>
            {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <input
            className="input-base"
            placeholder="Customer phone (optional)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            style={{ width: '100%', marginBottom: 12, fontSize: 12.5 }}
            inputMode="tel"
          />

          <Button
            variant="primary"
            size="lg"
            loading={saving}
            icon={<Check size={16} />}
            disabled={cart.length === 0 || saving}
            onClick={handleProceed}
            style={{ width: '100%', marginTop: 12 }}
          >
            Proceed
          </Button>
        </div>
      </div>

      {/* ── Invoice preview (80mm thermal receipt) ── */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Invoice Preview" size="sm">
        {receipt && (
          <div>
            <div id="pos-receipt" className="thermal-receipt">
              <div style={{ textAlign: 'center' }}>
                <div className="tr-shop">KAH Laban</div>
                <div className="tr-muted">— Sale Receipt —</div>
              </div>
              <div className="tr-divider" />
              <div className="tr-row"><span>Order No.</span><span>{receipt.invoice_number}</span></div>
              <div className="tr-row"><span>Date</span><span>{new Date(receipt.created_at).toLocaleString()}</span></div>
              <div className="tr-row"><span>Cashier</span><span>{receipt.cashier_name}</span></div>
              <div className="tr-row"><span>Customer</span><span>{receipt.customer_name || 'Walk-in'}</span></div>
              <div className="tr-divider" />
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', wordBreak: 'break-word' }}>{it.name}</td>
                      <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{(+it.unit_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{(+it.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tr-divider" />
              <div className="tr-row"><span>Subtotal</span><span>{(+receipt.subtotal).toFixed(2)}</span></div>
              <div className="tr-row"><span>Discount</span><span>−{(+receipt.discount || 0).toFixed(2)}</span></div>
              <div className="tr-row tr-total"><span>TOTAL</span><span>{(+receipt.total).toFixed(2)} Rs.</span></div>
              <div className="tr-row"><span>Payment</span><span>{PAYMENT_LABELS[receipt.payment_method] || receipt.payment_method}</span></div>
              <div className="tr-divider" />
              <div className="tr-muted" style={{ textAlign: 'center' }}>Thank you! Please come again.</div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="secondary" icon={<X size={15} />} onClick={() => setReceipt(null)}>Close</Button>
              <Button variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Pos