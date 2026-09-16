import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { Sun } from 'lucide-react'
import { salesService } from '../../services/salesService'
import { SL_SEASONAL_EVENTS } from '../../utils/constants'
import { formatCurrencyShort } from '../../utils/formatters'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const BAR_COLORS  = ['#3b82f6','#f97316','#22c55e','#a855f7','#f59e0b','#ef4444',
                     '#06b6d4','#84cc16','#ec4899','#8b5cf6','#14b8a6','#f97316']

const SeasonalDemand = () => {
  const [salesByMonth,  setSalesByMonth]  = useState([])
  const [topProducts,   setTopProducts]   = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [trend, top] = await Promise.all([
          salesService.getDailyChart(365),
          salesService.getTopProducts(10),
        ])

        // Aggregate by month
        const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], revenue: 0, idx: i }))
        for (const d of trend) {
          const monthIdx = new Date(d.date).getMonth()
          byMonth[monthIdx].revenue += d.amount
        }
        setSalesByMonth(byMonth)
        setTopProducts(top)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const maxRevenue = Math.max(...salesByMonth.map(m => m.revenue), 1)
  const thisMonthIdx = new Date().getMonth()

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#ea6c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun size={16} color="#fff" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Seasonal Demand Analysis</h1>
          </div>
          <p className="page-subtitle">12-month revenue patterns with Sri Lankan seasonal event mapping</p>
        </div>
      </div>

      {/* Monthly revenue bar chart */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>Monthly Revenue — Last 12 Months</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Orange bar = current month. Events marked below.</p>
        </div>
        {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByMonth} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrencyShort(v).replace('Rs. ','')} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={v => [formatCurrencyShort(v), 'Revenue']}
                contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }}
              />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                {salesByMonth.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={i === thisMonthIdx ? '#f97316'
                      : SL_SEASONAL_EVENTS.some(e => e.month === i + 1 && e.impact === 'high') ? '#f59e0b'
                      : '#3b82f6'}
                    fillOpacity={entry.revenue === 0 ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { color: '#f97316', label: 'Current month' },
            { color: '#f59e0b', label: 'High-impact seasonal month' },
            { color: '#3b82f6', label: 'Regular month' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Sri Lankan seasonal events calendar */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Sri Lanka Seasonal Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SL_SEASONAL_EVENTS.map((event, i) => {
              const isPast    = event.month < new Date().getMonth() + 1
              const isCurrent = event.month === new Date().getMonth() + 1
              const isUpcoming= !isPast && !isCurrent
              return (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 9,
                  background: isCurrent ? '#fff7ed' : isPast ? '#fafafa' : 'var(--content-bg)',
                  border: `1px solid ${isCurrent ? '#fed7aa' : 'var(--card-border)'}`,
                  opacity: isPast ? 0.6 : 1,
                }}>
                  <div style={{ minWidth: 32, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, fontWeight: 800, color: isCurrent ? '#f97316' : 'var(--text-muted)' }}>{MONTH_NAMES[event.month - 1]}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{event.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.note}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, flexShrink: 0,
                    background: event.impact === 'high' ? '#fff7ed' : '#fffbeb',
                    color: event.impact === 'high' ? '#f97316' : '#d97706',
                  }}>
                    {event.impact.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top products by month */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Top Selling Products (Overall)</h3>
          {loading ? (
            Array(6).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height: 14, marginBottom: 10, borderRadius: 6 }} />)
          ) : topProducts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No sales data yet</p>
          ) : topProducts.slice(0, 8).map((p, i) => {
            const pct = Math.round((p.qty / (topProducts[0]?.qty || 1)) * 100)
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p.product?.product_name}</span>
                  <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>{p.qty} sold</span>
                </div>
                <div style={{ height: 5, background: 'var(--content-bg)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SeasonalDemand
