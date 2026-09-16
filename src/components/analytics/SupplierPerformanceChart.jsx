import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SupplierPerformanceChart = ({ data = [], height = 220 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} barGap={4}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', fontSize: 12 }} />
      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="deliveryDays" name="Avg Delivery Days" fill="#f97316" radius={[4, 4, 0, 0]} />
      <Bar dataKey="orderCount" name="Total Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
)

export default SupplierPerformanceChart
