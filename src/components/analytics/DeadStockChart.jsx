import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '../../utils/formatters'

const DeadStockChart = ({ products = [], height = 200 }) => {
  const data = products.slice(0, 10).map(p => ({
    name: p.product_name?.substring(0, 14) || '—',
    value: p.quantity * p.buying_price,
    qty: p.quantity,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}K`}
        />
        <YAxis
          type="category" dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false} width={100}
        />
        <Tooltip
          formatter={(v, n) => [formatCurrency(v), 'Tied-up Value']}
          contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#6366f1' : i === 1 ? '#8b5cf6' : '#a78bfa'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default DeadStockChart
