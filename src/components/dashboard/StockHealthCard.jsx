// StockHealthCard.jsx
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export const StockHealthCard = ({ data = [] }) => (
  <div>
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip
          formatter={(v, n) => [v, n]}
          contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
      {data.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: item.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
          <span style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginLeft: 'auto', color: 'var(--text-primary)' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
)

export default StockHealthCard
