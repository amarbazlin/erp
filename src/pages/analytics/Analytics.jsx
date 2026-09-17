import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, BarChart3, RefreshCw } from 'lucide-react'
import { analyticsService } from '../../services/analyticsService'
import { formatCurrencyShort } from '../../utils/formatters'
import Loader from '../../components/shared/Loader'
import Button from '../../components/shared/Button'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 500 ? formatCurrencyShort(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 16 }}>
    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
    {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</p>}
  </div>
)

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState([])
  const [trend, setTrend] = useState([])
  const [stockHealth, setStockHealth] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [rev, tr, health] = await Promise.all([
        analyticsService.getRevenueChart(90),
        analyticsService.getPurchaseSaleTrend(6),
        analyticsService.getStockHealth(),
      ])
      setRevenue(rev)
      setTrend(tr)
      setStockHealth(health)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Business performance & inventory insights</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw />} size="sm" onClick={load}>Refresh</Button>
      </div>

      {/* Revenue trend */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <SectionHeader title="Revenue Trend (90 days)" subtitle="Weekly revenue performance" />
        {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 10 }} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrencyShort(v).replace('Rs. ', '')} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Purchase vs Sales trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Purchase vs Sales */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionHeader title="Purchases vs Sales" subtitle="6-month comparison" />
          {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatCurrencyShort(v).replace('Rs. ', '')} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Sales" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Stock health breakdown */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <SectionHeader title="Stock Health Distribution" subtitle="Overall inventory health status" />
        {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {stockHealth.map(s => (
              <div key={s.name} className="card" style={{ flex: '1 0 140px', padding: '16px 20px', border: 'none', borderLeft: `4px solid ${s.color}`, borderRadius: 0, borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>{s.name}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>products</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics
