import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, Sparkles, RefreshCw, ChevronDown, Brain } from 'lucide-react'
import { productService } from '../../services/productService'
import { salesService } from '../../services/salesService'
import { aiService } from '../../services/aiService'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters'

const AIInsightBox = ({ insight, loading }) => (
  <div style={{
    background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)',
    border: '1px solid #1e2530',
    borderRadius: 14,
    padding: '20px 24px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Glow effect */}
    <div style={{
      position: 'absolute', top: -30, right: -30,
      width: 120, height: 120, borderRadius: 99,
      background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(249,115,22,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={14} color="#f97316" />
      </div>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>
        AI Forecast Insight
      </span>
      <span style={{
        fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316',
        padding: '2px 8px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto',
      }}>
        Powered by Claude
      </span>
    </div>

    {loading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[80, 100, 60, 90].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    ) : insight ? (
      <p style={{
        fontSize: 13.5, color: '#9ca3af', lineHeight: 1.8,
        margin: 0, whiteSpace: 'pre-line', fontFamily: 'DM Sans, sans-serif',
      }}>
        {insight}
      </p>
    ) : (
      <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontStyle: 'italic' }}>
        Select a product above to get AI-powered demand forecasting insights.
      </p>
    )}
  </div>
)

// Simulate forecast points based on sales history
const buildForecastData = (history) => {
  if (!history || history.length === 0) return []

  const avg = history.reduce((s, d) => s + d.amount, 0) / (history.length || 1)
  const trend = history.length > 1
    ? (history[history.length - 1].amount - history[0].amount) / history.length
    : 0

  const actual = history.map((d, i) => ({ ...d, type: 'actual' }))

  const forecast = Array.from({ length: 7 }, (_, i) => {
    const projected = Math.max(0, avg + trend * (history.length + i) + (Math.random() - 0.5) * avg * 0.15)
    const date = new Date()
    date.setDate(date.getDate() + i + 1)
    return {
      date: date.toISOString().slice(0, 10),
      amount: null,
      forecast: Math.round(projected),
    }
  })

  return [
    ...actual.map(d => ({ ...d, forecast: null })),
    ...forecast,
  ]
}

const Forecasting = () => {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [salesHistory, setSalesHistory] = useState([])
  const [forecastData, setForecastData] = useState([])
  const [insight, setInsight] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    productService.getAll({ status: 'active' })
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoadingProducts(false))
  }, [])

  const handleSelectProduct = async (product) => {
    setSelectedProduct(product)
    setInsight('')
    setLoadingHistory(true)

    try {
      // Get sales data for this product
      const allSales = await salesService.getTopProducts(100)
      const productSales = allSales.find(s => s.product?.id === product.id)

      // Build simulated daily sales for chart (using product's sales velocity as basis)
      const days = 30
      const avgDaily = productSales ? productSales.qty / 30 : 0
      const history = Array.from({ length: days }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (days - i))
        const noise = (Math.random() - 0.4) * avgDaily
        return {
          date: d.toISOString().slice(0, 10),
          amount: Math.max(0, Math.round(avgDaily + noise)),
        }
      })

      setSalesHistory(history)
      setForecastData(buildForecastData(history))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleGetAIInsight = async () => {
    if (!selectedProduct) return
    setLoadingAI(true)
    setInsight('')
    try {
      const text = await aiService.getForecastInsight({
        productName: selectedProduct.product_name,
        salesHistory: salesHistory.slice(-14).map(d => ({ date: d.date, qty: d.amount })),
        currentStock: selectedProduct.quantity,
        reorderLevel: selectedProduct.reorder_level,
        avgDeliveryDays: selectedProduct.suppliers?.average_delivery_days || 3,
      })
      setInsight(text)
    } catch (err) {
        console.error('AI Error:', err)
        setInsight('Error: ' + err.message)
    } finally {
      setLoadingAI(false)
    }
  }

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => p.value !== null && (
          <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
            {p.name}: {p.value} units
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #f97316, #ea6c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#fff" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>AI Demand Forecasting</h1>
          </div>
          <p className="page-subtitle">Select a product to analyse demand patterns and get AI-powered predictions</p>
        </div>
        <div style={{ fontSize: 11, background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={13} /> ForgeraAI Engine
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Product selector panel */}
        <div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <input
              className="input-base"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.06em' }}>
                PRODUCTS ({filtered.length})
              </span>
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {loadingProducts ? (
                <div style={{ padding: 24, textAlign: 'center' }}><Loader /></div>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    background: selectedProduct?.id === p.id ? '#fff7ed' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    borderLeft: selectedProduct?.id === p.id ? '3px solid #f97316' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (selectedProduct?.id !== p.id) e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={e => { if (selectedProduct?.id !== p.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {p.product_name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {p.quantity}</span>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: p.quantity <= p.reorder_level ? '#fef2f2' : '#f0fdf4',
                      color: p.quantity <= p.reorder_level ? '#dc2626' : '#16a34a',
                      fontWeight: 600,
                    }}>
                      {p.quantity <= p.reorder_level ? 'Low' : 'OK'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!selectedProduct ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 80 }}>
                <TrendingUp size={44} strokeWidth={1.5} />
                <h3>Select a product to begin</h3>
                <p>Choose a product from the left panel to view its demand forecast</p>
              </div>
            </div>
          ) : (
            <>
              {/* Product info banner */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
                      {selectedProduct.product_name}
                    </h2>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>
                      <span>Stock: <strong style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{selectedProduct.quantity}</strong></span>
                      <span>Reorder at: <strong style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{selectedProduct.reorder_level}</strong></span>
                      <span>Supplier lead: <strong style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{selectedProduct.suppliers?.average_delivery_days || '?'} days</strong></span>
                      <span>Sell price: <strong style={{ color: 'var(--success)', fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(selectedProduct.selling_price)}</strong></span>
                    </div>
                  </div>
                  <Button
                    icon={<Sparkles />}
                    loading={loadingAI}
                    onClick={handleGetAIInsight}
                    size="sm"
                  >
                    Get AI Insight
                  </Button>
                </div>
              </div>

              {/* Forecast chart */}
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
                      Demand Forecast
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      30-day actual + 7-day projected demand
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 20, height: 2.5, background: '#f97316', borderRadius: 2 }} />
                      Actual
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 20, height: 2.5, background: '#3b82f6', borderRadius: 2, borderBottom: '2px dashed #3b82f6' }} />
                      Forecast
                    </div>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="skeleton" style={{ height: 220, borderRadius: 10 }} />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={d => d?.slice(5)}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false} tickLine={false}
                        width={35}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="Actual"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        fill="url(#actualGrad)"
                        dot={false}
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        fill="url(#forecastGrad)"
                        dot={false}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* AI Insight */}
              <AIInsightBox insight={insight} loading={loadingAI} />

              {/* Forecast stats */}
              {!loadingHistory && salesHistory.length > 0 && (
                <div className="grid-3">
                  {[
                    {
                      label: 'Avg Daily Sales',
                      value: `${(salesHistory.reduce((s, d) => s + d.amount, 0) / salesHistory.length).toFixed(1)} units`,
                      color: '#f97316',
                    },
                    {
                      label: 'Days of Stock Left',
                      value: (() => {
                        const avg = salesHistory.reduce((s, d) => s + d.amount, 0) / salesHistory.length
                        return avg > 0 ? `${Math.floor(selectedProduct.quantity / avg)} days` : '∞'
                      })(),
                      color: selectedProduct.quantity <= selectedProduct.reorder_level ? '#ef4444' : '#22c55e',
                    },
                    {
                      label: 'Suggested Reorder Qty',
                      value: (() => {
                        const avg = salesHistory.reduce((s, d) => s + d.amount, 0) / salesHistory.length
                        const leadTime = selectedProduct.suppliers?.average_delivery_days || 3
                        return `${Math.ceil(avg * leadTime * 1.5)} units`
                      })(),
                      color: '#3b82f6',
                    },
                  ].map(stat => (
                    <div key={stat.label} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${stat.color}` }}>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{stat.label}</div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, color: stat.color }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Forecasting
