import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Package, ShoppingCart,
  AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight,
  Plus, Eye, RefreshCw
} from 'lucide-react'
import { salesService } from '../../services/salesService'
import { productService } from '../../services/productService'
import { analyticsService } from '../../services/analyticsService'
import { alertsService } from '../../services/alertsService'
import { formatCurrencyShort, formatCurrency, formatDate, formatRelative } from '../../utils/formatters'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import Loader from '../../components/shared/Loader'

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7']

const MetricCard = ({ title, value, change, changeLabel, icon: Icon, color, loading }) => (
  <div className="card" style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{title}</span>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
    {loading ? (
      <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
    ) : (
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
        {value}
      </div>
    )}
    {change !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        {change >= 0 ? (
          <><ArrowUpRight size={13} color="var(--success)" /><span style={{ color: 'var(--success)', fontWeight: 600 }}>+{change.toFixed(1)}%</span></>
        ) : (
          <><ArrowDownRight size={13} color="var(--danger)" /><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{change.toFixed(1)}%</span></>
        )}
        <span style={{ color: 'var(--text-muted)' }}>{changeLabel || 'vs last month'}</span>
      </div>
    )}
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrencyShort(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [salesSummary, setSalesSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [productSummary, setProductSummary] = useState(null)
  const [stockHealth, setStockHealth] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [sales, chart, top, prodSum, health, alerts, lowStock, trend] = await Promise.all([
          salesService.getSummary(30),
          salesService.getDailyChart(30),
          salesService.getTopProducts(7),
          productService.getSummary(),
          analyticsService.getStockHealth(),
          alertsService.getAll({ resolved: false }),
          productService.getBelowReorder(),
          analyticsService.getPurchaseSaleTrend(6),
        ])
        setSalesSummary(sales)
        setChartData(chart)
        setTopProducts(top)
        setProductSummary(prodSum)
        setStockHealth(health)
        setRecentAlerts((alerts || []).slice(0, 5))
        setLowStockProducts((lowStock || []).slice(0, 5))
        setTrendData(trend)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Metrics row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricCard
          title="Total Sales (30d)"
          value={formatCurrencyShort(salesSummary?.total || 0)}
          change={1.5}
          icon={DollarSign}
          color="#f97316"
          loading={loading}
        />
        <MetricCard
          title="Total Orders (30d)"
          value={formatCurrencyShort(salesSummary?.count || 0).replace('Rs.', '').trim() || (salesSummary?.count || 0)}
          change={-0.7}
          icon={ShoppingCart}
          color="#3b82f6"
          loading={loading}
        />
        <MetricCard
          title="Total Products"
          value={productSummary?.totalProducts || 0}
          change={2.1}
          icon={Package}
          color="#22c55e"
          loading={loading}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={productSummary?.lowStockCount || 0}
          changeLabel="items need reorder"
          icon={AlertTriangle}
          color="#ef4444"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>
        {/* Sales trend chart */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>Overall Sales</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Revenue vs Purchases — last 6 months</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['1W', '1M', '6M'].map(r => (
                <button key={r} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--card-border)', background: r === '6M' ? '#0d1117' : 'transparent', color: r === '6M' ? '#fff' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>{r}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatCurrencyShort(v).replace('Rs. ', '')} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#f97316" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#3b82f6" strokeWidth={2} fill="url(#purchaseGrad)" dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock health pie */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>Stock Health</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Current inventory status</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 160, borderRadius: 99, width: 160, margin: '0 auto' }} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stockHealth} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                    {stockHealth.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                {stockHealth.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: s.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', marginLeft: 'auto' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Sales + Reorder needed + Top products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Low stock products table */}
        <div className="card dashboard-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 0', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>Reorder Required</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Products below reorder level</p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View all <Eye size={13} />
            </button>
          </div>

          {/* Desktop / tablet table */}
          <div className="table-scroll-wrapper hide-mobile" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Reorder At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}><Loader /></td></tr>
                ) : lowStockProducts.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>✓ All products are well stocked</td></tr>
                ) : lowStockProducts.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.product_code}</div>
                    </td>
                    <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: p.quantity === 0 ? 'var(--danger)' : 'var(--warning)' }}>{p.quantity}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{p.reorder_level}</td>
                    <td><StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="show-mobile" style={{ padding: '12px 14px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Loader /></div>
            ) : lowStockProducts.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>✓ All products are well stocked</p>
            ) : (
              <div className="mobile-card-list">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="mobile-data-card">
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{p.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{p.product_code}</div>
                    <div className="mobile-data-card-row">
                      <span className="mobile-data-card-label">Stock</span>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: p.quantity === 0 ? 'var(--danger)' : 'var(--warning)' }}>{p.quantity}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span className="mobile-data-card-label">Reorder at</span>
                      <span>{p.reorder_level}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span className="mobile-data-card-label">Status</span>
                      <StockStatusBadge quantity={p.quantity} reorderLevel={p.reorder_level} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top products + recent alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top selling */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Top Selling</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 30 days</span>
            </div>
            {loading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 14, marginBottom: 10, borderRadius: 6 }} />)
            ) : topProducts.slice(0, 6).map((p, i) => (
              <div key={p.product?.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? '#fff7ed' : 'var(--content-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i === 0 ? '#f97316' : 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{p.product?.product_name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>{p.qty} sold</span>
              </div>
            ))}
          </div>

          {/* Recent alerts */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Recent Alerts</h3>
              <button onClick={() => navigate('/alerts')} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
            </div>
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 8 }} />)
            ) : recentAlerts.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No active alerts</p>
            ) : recentAlerts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: 7, height: 7, borderRadius: 99, background: a.severity === 'critical' ? 'var(--danger)' : a.severity === 'high' ? '#f97316' : 'var(--warning)', flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{formatRelative(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
