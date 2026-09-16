import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { Sun, Sparkles, Brain, RefreshCw, TrendingUp, Calendar } from 'lucide-react'
import { salesService } from '../../services/salesService'
import { getSeasonalAnalysis, getProductSeasonalPattern } from '../../services/aiService'
import { SL_SEASONAL_EVENTS, SL_MONTHS } from '../../utils/constants'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrencyShort } from '../../utils/formatters'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const BAR_COLORS  = ['#3b82f6','#f97316','#22c55e','#a855f7','#f59e0b','#ef4444',
                     '#06b6d4','#84cc16','#ec4899','#8b5cf6','#14b8a6','#f97316']

const AIInsightPanel = ({ insight, loading, title }) => (
  <div style={{
    background: 'linear-gradient(135deg,#0d1117,#1a1f2e)',
    border: '1px solid #1e2530', borderRadius: 14, padding: '18px 22px',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 99, background: 'radial-gradient(circle,rgba(249,115,22,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={13} color="#f97316" />
      </div>
      <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
      <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', padding: '1px 7px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto' }}>Claude</span>
    </div>
    {loading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[80,100,65,90,55].map((w,i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    ) : insight ? (
      <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line', fontFamily: 'DM Sans,sans-serif' }}>
        {insight}
      </p>
    ) : (
      <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontStyle: 'italic' }}>
        Click "Analyse with AI" to generate seasonal insights.
      </p>
    )}
  </div>
)

const SeasonalDemand = () => {
  const [salesByMonth,  setSalesByMonth]  = useState([])
  const [topProducts,   setTopProducts]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [aiInsight,     setAiInsight]     = useState('')
  const [loadingAI,     setLoadingAI]     = useState(false)
  const currentMonth = MONTH_NAMES[new Date().getMonth()]

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

  const handleAnalyse = async () => {
    setLoadingAI(true)
    setAiInsight('')
    try {
      const upcomingEvents = SL_SEASONAL_EVENTS.filter(e => {
        const curIdx = new Date().getMonth() + 1
        return e.month >= curIdx && e.month <= curIdx + 3
      })
      const text = await getSeasonalAnalysis({
        salesByMonth: salesByMonth.map(m => ({ month: m.month, revenue: Math.round(m.revenue) })),
        topProducts,
        currentMonth,
        upcomingEvents,
      })
      setAiInsight(text)
    } catch (err) {
      setAiInsight('Unable to generate analysis. Please check your API configuration.')
    } finally { setLoadingAI(false) }
  }

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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 11, background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Brain size={13} /> ForgeraAI
          </div>
          <Button icon={<Sparkles />} loading={loadingAI} onClick={handleAnalyse}>Analyse with AI</Button>
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

      {/* AI Insight */}
      <AIInsightPanel insight={aiInsight} loading={loadingAI} title="AI Seasonal Forecast & Pre-stocking Advice" />
    </div>
  )
}

export default SeasonalDemand
