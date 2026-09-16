// DemandForecastChart.jsx
import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export const DemandForecastChart = ({ data = [], height = 220 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="forecastGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={35} />
      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }} />
      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
      <Area type="monotone" dataKey="actual" name="Actual" stroke="#f97316" strokeWidth={2.5} fill="url(#demandGrad)" dot={false} />
      <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" fill="url(#forecastGrad2)" dot={false} />
    </AreaChart>
  </ResponsiveContainer>
)

export default DemandForecastChart
