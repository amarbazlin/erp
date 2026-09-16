import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrencyShort } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, fontFamily: 'Outfit, sans-serif', margin: '2px 0' }}>
          {p.name}: {formatCurrencyShort(p.value)}
        </p>
      ))}
    </div>
  )
}

const SalesChart = ({ data = [], height = 200, showPurchases = false }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="scSales" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="scPurchases" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
      <YAxis
        tickFormatter={v => formatCurrencyShort(v).replace('Rs. ', '')}
        tick={{ fontSize: 11, fill: '#9ca3af' }}
        axisLine={false} tickLine={false} width={48}
      />
      <Tooltip content={<CustomTooltip />} />
      {showPurchases && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />}
      <Area type="monotone" dataKey="sales" name="Sales" stroke="#f97316" strokeWidth={2.5} fill="url(#scSales)" dot={false} />
      {showPurchases && (
        <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" fill="url(#scPurchases)" dot={false} />
      )}
    </AreaChart>
  </ResponsiveContainer>
)

export default SalesChart
