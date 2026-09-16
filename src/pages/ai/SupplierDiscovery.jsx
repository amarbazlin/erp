import React, { useState, useEffect } from 'react'
import { Search, Sparkles, Brain, RefreshCw, Truck, MessageCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { supplierService } from '../../services/supplierService'
import { productService } from '../../services/productService'
import { getAlternativeSupplierSuggestions, getSupplierNegotiationPoints } from '../../services/aiService'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import SearchBar from '../../components/shared/SearchBar'
import { formatCurrencyShort } from '../../utils/formatters'

// ── AI text panel ─────────────────────────────────────────────────────────────
const AIPanel = ({ insight, loading, placeholder }) => (
  <div style={{
    background: 'linear-gradient(135deg,#0d1117,#1a1f2e)',
    border: '1px solid #1e2530', borderRadius: 14,
    padding: '18px 22px', minHeight: 140,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={13} color="#f97316" />
      </div>
      <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>AI Response</span>
      <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', padding: '1px 7px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto' }}>Powered by Claude</span>
    </div>
    {loading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[90, 75, 100, 60, 85].map((w, i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    ) : insight ? (
      <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line', fontFamily: 'DM Sans,sans-serif' }}>
        {insight}
      </p>
    ) : (
      <p style={{ fontSize: 13, color: '#4b5563', fontStyle: 'italic', margin: 0 }}>{placeholder}</p>
    )}
  </div>
)

// ── Supplier performance card ─────────────────────────────────────────────────
const SupplierCard = ({ supplier, selected, onSelect, onNegotiate }) => {
  const [expanded, setExpanded] = useState(false)

  const score = Math.max(0, Math.min(100,
    100
    - (supplier.avg_delivery_days || 3) * 5
    + (supplier.orderCount || 0) * 2
  ))

  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div
      style={{
        border: `1.5px solid ${selected ? '#f97316' : 'var(--card-border)'}`,
        borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s',
        background: selected ? '#fff7ed' : 'var(--card-bg)',
      }}
    >
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={() => onSelect(supplier)}
      >
        {/* Selection indicator */}
        <div style={{
          width: 18, height: 18, borderRadius: 99, flexShrink: 0,
          border: `2px solid ${selected ? '#f97316' : 'var(--card-border)'}`,
          background: selected ? '#f97316' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#fff' }} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
            {supplier.supplier_name}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span>📞 {supplier.phone || 'No phone'}</span>
            <span>🚚 {supplier.average_delivery_days || '?'} day lead</span>
            <span>📦 {supplier.orderCount || 0} orders</span>
          </div>
        </div>

        {/* Performance score */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 800, color: scoreColor }}>{score}</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>SCORE</div>
          <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 3 }}>
            <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 99 }} />
          </div>
        </div>

        <button onClick={e => { e.stopPropagation(); setExpanded(o => !o) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ paddingTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {supplier.email && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>✉ {supplier.email}</div>
            )}
            {supplier.address && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>📍 {supplier.address}</div>
            )}
            {supplier.totalPurchases > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                💰 Total purchased: <strong style={{ fontFamily: 'Outfit,sans-serif' }}>{formatCurrencyShort(supplier.totalPurchases)}</strong>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button size="sm" variant="secondary" icon={<MessageCircle />} onClick={() => onNegotiate(supplier)}>
              Generate Negotiation Points
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SupplierDiscovery = () => {
  const [suppliers,       setSuppliers]       = useState([])
  const [products,        setProducts]        = useState([])
  const [loadingData,     setLoadingData]     = useState(true)
  const [selectedSupplier,setSelectedSupplier]= useState(null)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [issue,           setIssue]           = useState('')
  const [productSearch,   setProductSearch]   = useState('')

  const [discoveryText,   setDiscoveryText]   = useState('')
  const [negotiationText, setNegotiationText] = useState('')
  const [loadingDisc,     setLoadingDisc]     = useState(false)
  const [loadingNeg,      setLoadingNeg]      = useState(false)

  const [activeTab, setActiveTab] = useState('discovery') // discovery | negotiation | performance

  useEffect(() => {
    const load = async () => {
      setLoadingData(true)
      try {
        const [sups, prods, perf] = await Promise.all([
          supplierService.getAll({ status: 'active' }),
          productService.getAll({ status: 'active' }),
          supplierService.getPerformance(),
        ])
        // Merge performance data into suppliers
        const perfMap = {}
        for (const p of perf) {
          const match = sups.find(s => s.supplier_name === p.supplier_name)
          if (match) perfMap[match.id] = p
        }
        const enriched = sups.map(s => ({ ...s, ...perfMap[s.id] }))
        setSuppliers(enriched)
        setProducts(prods)
      } catch (err) { console.error(err) }
      finally { setLoadingData(false) }
    }
    load()
  }, [])

  const handleDiscover = async () => {
    if (!selectedProduct) return alert('Select a product to search alternatives for')
    setLoadingDisc(true)
    setDiscoveryText('')
    try {
      const product = products.find(p => p.id === parseInt(selectedProduct))
      const text = await getAlternativeSupplierSuggestions({
        product:         product?.product_name || '',
        category:        product?.categories?.name || '',
        currentSupplier: product?.suppliers?.supplier_name || '',
        issue:           issue || 'Looking for alternative / backup supplier',
      })
      setDiscoveryText(text)
    } catch (err) {
      setDiscoveryText('Unable to generate suggestions. Check your API configuration.')
    } finally { setLoadingDisc(false) }
  }

  const handleNegotiate = async (supplier) => {
    setActiveTab('negotiation')
    setSelectedSupplier(supplier)
    setLoadingNeg(true)
    setNegotiationText('')
    try {
      // Get products from this supplier
      const supplierProducts = products.filter(p => p.supplier_id === supplier.id)
      const totalValue = supplierProducts.reduce((s, p) => s + p.quantity * p.buying_price, 0)
      const issues = []
      if (supplier.average_delivery_days > 5) issues.push('Long delivery times')
      if (supplier.orderCount < 3) issues.push('Low order frequency — may have leverage')

      const text = await getSupplierNegotiationPoints({
        supplierName: supplier.supplier_name,
        products: supplierProducts,
        totalOrderValue: totalValue * 12, // annualised
        performanceIssues: issues,
      })
      setNegotiationText(text)
    } catch (err) {
      setNegotiationText('Unable to generate negotiation points. Check your API configuration.')
    } finally { setLoadingNeg(false) }
  }

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const TABS = [
    { key: 'discovery',   label: 'Alternative Supplier Finder' },
    { key: 'negotiation', label: 'Negotiation Advisor'         },
    { key: 'performance', label: `Supplier Scores (${suppliers.length})` },
  ]

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#ea6c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={16} color="#fff" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Supplier Discovery</h1>
          </div>
          <p className="page-subtitle">Find alternative suppliers and get AI negotiation talking points</p>
        </div>
        <div style={{ fontSize: 11, background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={13} /> ForgeraAI Engine
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 5 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.key ? '#fff7ed' : 'transparent',
              color: activeTab === tab.key ? '#f97316' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Alternative Discovery ── */}
      {activeTab === 'discovery' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* Left: product selector + issue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>
                1. Select Product to Source
              </h3>
              <SearchBar value={productSearch} onChange={setProductSearch} placeholder="Search products…" width="100%" />
              <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 10, border: '1px solid var(--card-border)', borderRadius: 9 }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '14px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>No products found</div>
                ) : filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(String(p.id))}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                      background: selectedProduct === String(p.id) ? '#fff7ed' : 'transparent',
                      borderLeft: selectedProduct === String(p.id) ? '3px solid #f97316' : '3px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.product_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                      <span>{p.categories?.name || 'Uncategorized'}</span>
                      <span>· Current: {p.suppliers?.supplier_name || 'None'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>
                2. Describe the Issue (optional)
              </h3>
              <textarea
                value={issue}
                onChange={e => setIssue(e.target.value)}
                placeholder="e.g. Supplier frequently delays, price increased 20%, out of stock…"
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px', border: '1.5px solid var(--card-border)',
                  borderRadius: 9, fontSize: 13, fontFamily: 'DM Sans,sans-serif',
                  color: 'var(--text-primary)', background: 'var(--card-bg)',
                  outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
              />
              <div style={{ marginTop: 12 }}>
                <Button
                  fullWidth
                  icon={<Sparkles />}
                  loading={loadingDisc}
                  onClick={handleDiscover}
                  disabled={!selectedProduct}
                >
                  Find Alternative Suppliers
                </Button>
              </div>
            </div>

            {/* Selected product info */}
            {selectedProduct && (() => {
              const p = products.find(p => p.id === parseInt(selectedProduct))
              if (!p) return null
              return (
                <div className="card" style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>SELECTED PRODUCT</div>
                  <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 14 }}>{p.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Stock: {p.quantity} · Reorder @ {p.reorder_level} · Supplier: {p.suppliers?.supplier_name || 'None'}
                  </div>
                  {p.quantity <= p.reorder_level && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 5, alignItems: 'center', fontSize: 12, color: '#d97706' }}>
                      <AlertTriangle size={13} /> Low stock — urgent sourcing needed
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Right: AI result */}
          <div>
            {!discoveryText && !loadingDisc ? (
              <div style={{
                background: 'linear-gradient(135deg,#0d1117,#1a1f2e)',
                border: '1px solid #1e2530', borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '60px 40px', textAlign: 'center', gap: 16, minHeight: 360,
              }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={26} color="#f97316" />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Find Alternative Suppliers</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, maxWidth: 280 }}>
                    Select a product and Claude will identify sourcing options in Sri Lanka — local wholesalers, importers, and backup channels.
                  </p>
                </div>
              </div>
            ) : (
              <AIPanel insight={discoveryText} loading={loadingDisc} placeholder="" />
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Negotiation Advisor ── */}
      {activeTab === 'negotiation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          {/* Supplier list */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
              SELECT SUPPLIER TO NEGOTIATE WITH
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingData ? <Loader /> : suppliers.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleNegotiate(s)}
                  style={{
                    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${selectedSupplier?.id === s.id ? '#f97316' : 'var(--card-border)'}`,
                    background: selectedSupplier?.id === s.id ? '#fff7ed' : 'var(--card-bg)',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>{s.supplier_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {s.average_delivery_days} day lead · {s.orderCount || 0} orders
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Negotiation AI result */}
          <div>
            <AIPanel
              insight={negotiationText}
              loading={loadingNeg}
              placeholder={selectedSupplier ? 'Generating negotiation points…' : 'Select a supplier on the left to generate negotiation talking points powered by Claude.'}
            />
            {selectedSupplier && !loadingNeg && (
              <div style={{ marginTop: 12 }}>
                <Button variant="secondary" icon={<RefreshCw />} size="sm" onClick={() => handleNegotiate(selectedSupplier)}>
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Performance Scores ── */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Loader size={36} /></div>
          ) : suppliers.length === 0 ? (
            <div className="empty-state card" style={{ padding: 60 }}>
              <Truck size={36} strokeWidth={1.5} />
              <h3>No suppliers yet</h3>
              <p>Add suppliers in the Suppliers page first</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 9, fontSize: 12.5, color: '#92400e', marginBottom: 4 }}>
                <strong>How scores work:</strong> Based on delivery lead time and order frequency. Click any supplier to generate negotiation talking points.
              </div>
              {[...suppliers]
                .sort((a, b) => {
                  const scoreA = 100 - (a.average_delivery_days || 3) * 5 + (a.orderCount || 0) * 2
                  const scoreB = 100 - (b.average_delivery_days || 3) * 5 + (b.orderCount || 0) * 2
                  return scoreB - scoreA
                })
                .map(s => (
                  <SupplierCard
                    key={s.id}
                    supplier={s}
                    selected={selectedSupplier?.id === s.id}
                    onSelect={setSelectedSupplier}
                    onNegotiate={handleNegotiate}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SupplierDiscovery
