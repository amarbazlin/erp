import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { analyticsService } from '../../services/analyticsService'
import Button from './Button'
import Loader from './Loader'

export default function InventoryOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    analyticsService.getInventoryOverview().then(result => {
      if (active) setData(result)
    }).catch(err => { if (active) setError(err.message || 'Unable to load inventory.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [version])
  return <section className="card" style={{ padding: 20, marginTop: 20, minWidth: 0 }} aria-label="Inventory overview">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <h3>Raw-material stock health</h3>
      <Button size="sm" variant="secondary" disabled={loading} onClick={() => setVersion(v => v + 1)}>Refresh inventory</Button>
    </div>
    {loading ? <Loader /> : error ? <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p> : data && <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 240, maxWidth: '100%' }}>
          {data.total ? <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={data.health} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
              {data.health.map(s => <Cell key={s.name} fill={s.color} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer> : <p>No active raw materials.</p>}
        </div>
        <div>{data.health.map(s => <p key={s.name}><span style={{ color: s.color, fontWeight: 700 }}>{s.name}: {s.value}</span> materials</p>)}</div>
      </div>
      <h3>Reorder required</h3>
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
        <table className="data-table"><thead><tr><th>Material</th><th>SKU</th><th>Stock (g)</th><th>Threshold (g)</th></tr></thead>
          <tbody>{data.lowStock.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.sku || '—'}</td><td>{Number(item.current_quantity).toLocaleString()}</td><td>{Number(item.low_stock_threshold).toLocaleString()}</td></tr>)}
            {!data.lowStock.length && <tr><td colSpan={4}>No materials need reordering.</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </section>
}
