import React, { useState, useMemo } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, Search, Check } from 'lucide-react'
import { usePosProducts, useCategories } from '../../hooks/useProducts'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../context/AuthContext'
import CustomerSelect from '../../components/customers/CustomerSelect'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'

const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online' }

const qtyBtn = {
  width: 24, height: 24, borderRadius: 6, border: '1px solid var(--card-border)',
  background: 'var(--content-bg)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0,
}

const Pos = () => {
  const { user } = useAuth()
  const { products, loading, refetch } = usePosProducts()
  const { categories } = useCategories()

  const [search,        setSearch]        = useState('')
  const [selectedCat,   setSelectedCat]   = useState(null)
  const [cart,          setCart]          = useState([])   // { product, quantity }
  const [customerId,    setCustomerId]    = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount,      setDiscount]      = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [receipt,       setReceipt]       = useState(null)

  const filtered = useMemo(() => {
    let list = products
    if (selectedCat) list = list.filter(p => p.category_id === selectedCat)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
    }
    return list
  }, [products, selectedCat, search])

  const subtotal = cart.reduce((s, c) => s + c.product.selling_price * c.quantity, 0)
  const total    = Math.max(0, subtotal - (parseFloat(discount) || 0))

  const addToCart = (product) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.product.id === product.id)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart(prev => prev
      .map(c => c.product.id === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    )
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setSaving(true)
    try {
      const items = cart.map(c => ({
        product_id: c.product.id,
        quantity:   c.quantity,
        unit_price: c.product.selling_price,
        unit_cost:  c.product.calculated_cost || 0,
      }))
      const sale = await salesService.create({
        items,
        paymentMethod,
        cashierId: user?.id,
        customerId,
        discount: parseFloat(discount) || 0,
      })
      // Deduct raw materials via recipes (DB trigger updates stock)
      await salesService.deductInventory(sale)
      setReceipt(sale)
      setCart([])
      setDiscount(0)
      setCustomerId(null)
      refetch()
    } catch (err) {
      alert('Checkout failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader fullPage label="Loading products…" />

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 90px)' }}>
      {/* ── Product grid ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-base" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <button
            onClick={() => setSelectedCat(null)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--card-border)', background: !selectedCat ? '#f97316' : 'var(--card-bg)', color: !selectedCat ? '#fff' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >All</button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--card-border)', background: selectedCat === c.id ? '#f97316' : 'var(--card-bg)', color: selectedCat === c.id ? '#fff' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            >{c.name}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}><ShoppingCart size={32} /><p>No products found</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => p.in_stock && addToCart(p)}
                disabled={!p.in_stock}
                className="card"
                style={{
                  padding: 16, textAlign: 'left', cursor: p.in_stock ? 'pointer' : 'not-allowed',
                  opacity: p.in_stock ? 1 : 0.45, border: '1px solid var(--card-border)',
                }}
              >
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{p.sku}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 15, color: '#f97316' }}>{formatCurrency(p.selling_price)}</span>
                  <span style={{ fontSize: 10.5, color: p.in_stock ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {p.in_stock ? `${p.available_stock} left` : 'Out of stock'}
                  </span>
                </div>
              </button>
            ))}
          </div>
                )}
      </div>

      {/* ── Cart sidebar ── */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', border: '1px solid var(--card-border)', borderRadius: 12, background: 'var(--card-bg)' }}>
        {/* Cart items */}<div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Order ({cart.reduce((s, c) => s + c.quantity, 0)} items)
          </h3>
          {cart.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <ShoppingCart size={24} style={{ marginBottom: 8 }} />
              <p>No items in cart</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.map((c) => (
                <div key={c.product.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{c.product.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => changeQty(c.product.id, -1)} style={{ ...qtyBtn, width: 24, height: 22, fontSize: 10 }}>
                      <Minus size={10} />
                    </button>
                    <span style={{ fontSize: 12, minWidth: 20, textAlign: 'center' }}>{c.quantity}</span>
                    <button onClick={() => changeQty(c.product.id, 1)} style={{ ...qtyBtn, width: 24, height: 22, fontSize: 10 }}>
                      <Plus size={10} />
                    </button>
                  </div>
                  <span style={{ width: 70, textAlign: 'right', fontSize: 12.5, fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>{formatCurrency(c.product.selling_price * c.quantity)}</span>
                  <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== c.product.id))} style={{ ...qtyBtn, width: 22, height: 22, padding: 2, color: 'var(--danger)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}<div style={{ padding: 16, borderTop: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Subtotal</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input-base" type="number" min="0" placeholder="Discount (Rs.)" value={discount} onChange={e => setDiscount(e.target.value)} style={{ width: 120, fontSize: 12.5 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#f97316', fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(total)}</span>
          </div>

          <select className="input-base" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', marginBottom: 12, fontSize: 12.5 }}>
            {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <CustomerSelect value={customerId} onChange={setCustomerId} />

          <Button
            variant="primary"
            size="lg"
            loading={saving}
            icon={<Check size={16} />}
            disabled={cart.length === 0}
            onClick={handleCheckout}
            style={{ width: '100%', marginTop: 12 }}
          >
            Checkout
          </Button>
        </div>
      </div>

      {/* Receipt modal */}<Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale Complete!" size="sm">
        {receipt && (
          <div>
            <p style={{ fontSize: 13.5, marginBottom: 12 }}>
              Invoice: <strong>{receipt.invoice_number}</strong>
            </p>
            <p style={{ fontSize: 13.5, marginBottom: 12 }}>
              Total: <strong>{formatCurrency(receipt.total)}</strong>
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {receipt.sale_items?.length || 0} item(s) sold. Raw material stock has been deducted.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setReceipt(null); refetch() }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Pos
