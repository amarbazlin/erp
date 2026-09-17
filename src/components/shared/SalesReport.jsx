import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RefreshCw } from 'lucide-react'
import { analyticsService } from '../../services/analyticsService'
import { businessDay, shiftDay, dayBounds, SALES_TIMEZONE } from '../../utils/salesReporting'
import { formatCurrency, formatCurrencyShort, formatChartCurrency } from '../../utils/formatters'
import Button from './Button'
import Loader from './Loader'

const panel = { padding: 20, minWidth: 0, marginBottom: 20 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }
const dateTime = value => new Date(value).toLocaleString('en-GB', { timeZone: SALES_TIMEZONE })
const Chart = ({ data, forecast = false }) => (
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data} margin={{ top: 10, right: 16, bottom: 5, left: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
      <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={formatCurrencyShort} />
      <Tooltip formatter={formatChartCurrency} contentStyle={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} />
      <Legend />
      {forecast ? <Line dataKey="forecast" name="Estimated sales" stroke="#a855f7" strokeDasharray="5 5" strokeWidth={2} /> : <>
        <Line dataKey="revenue" name="Sales" stroke="#f97316" strokeWidth={2} />
        <Line dataKey="cost" name="Recorded ingredient cost" stroke="#3b82f6" strokeWidth={2} />
      </>}
    </LineChart>
  </ResponsiveContainer>
)

export default function SalesReport({ initialDays = 30 }) {
  const [range, setRange] = useState(() => ({ start: shiftDay(businessDay(), 1 - initialDays), end: businessDay() }))
  const [draft, setDraft] = useState(range)
  const [version, setVersion] = useState(0)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setReport(null)
    setPage(0)
    analyticsService.getSalesReport(range.start, range.end).then(data => {
      if (active) setReport(data)
    }).catch(err => { if (active) setError(err.message || 'Unable to load sales.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [range, version])
  const apply = next => {
    try {
      dayBounds(next.start, next.end)
      setValidation('')
      setDraft(next)
      setRange({ ...next })
    } catch (err) { setValidation(err.message) }
  }
  const preset = days => apply({ start: shiftDay(businessDay(), 1 - days), end: businessDay() })
  return <section aria-label="Sales report">
    <div className="card" style={panel}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
        <Button variant="secondary" size="sm" onClick={() => preset(1)}>Today</Button>
        <Button variant="secondary" size="sm" onClick={() => apply({ start: shiftDay(businessDay(), -1), end: shiftDay(businessDay(), -1) })}>Yesterday</Button>
        <Button variant="secondary" size="sm" onClick={() => preset(7)}>7 days</Button>
        <Button variant="secondary" size="sm" onClick={() => preset(30)}>30 days</Button>
        <label>From<input aria-label="Sales start date" className="input-base" type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label>
        <label>To<input aria-label="Sales end date" className="input-base" type="date" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></label>
        <Button size="sm" onClick={() => apply(draft)}>Apply</Button>
        <Button size="sm" variant="secondary" icon={<RefreshCw />} onClick={() => setVersion(v => v + 1)} loading={loading}>Refresh</Button>
      </div>
      <p className="page-subtitle" style={{ marginTop: 10 }}>Completed sales · {range.start} to {range.end} · Sri Lankan time. Select the same start and end date to view one day.</p>
      {validation && <p role="alert" style={{ color: 'var(--danger)' }}>{validation}</p>}
    </div>
    {error && <div className="card" role="alert" style={{ ...panel, color: 'var(--danger)' }}>Sales could not be loaded: {error} Use Refresh to retry.</div>}
    {loading && <div style={panel}><Loader /></div>}
    {!loading && report && <>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[['Sales', formatCurrency(report.total)], ['Orders', report.count], ['Gross profit', formatCurrency(report.profit)], ['Discounts', formatCurrency(report.discount)]].map(([label, value]) => <div key={label} className="card" style={{ padding: 20 }}>
          <div className="page-subtitle">{label}</div><div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800 }}>{value}</div>
        </div>)}
      </div>
      <p className="page-subtitle">Gross profit excludes tax and recorded ingredient costs, before operating expenses. Refunds are not separately deducted from completed sales totals.</p>
      <div style={grid}>
        <div className="card" style={panel}><h3>Daily sales</h3>{!report.count && <p>No completed sales in this period.</p>}<Chart data={report.daily} /></div>
        <div className="card" style={panel}><h3>Sales forecast — next 7 days</h3>
          {report.forecast.total === null ? <p className="page-subtitle">Insufficient history. At least 7 completed calendar days since the first sale are needed.</p> : <>
            <p className="page-subtitle">Estimate: {formatCurrency(report.forecast.total)} · average revenue across {report.forecast.days} completed days, including zero-sales days. Independent of the date filter; not guaranteed revenue.</p>
            <Chart data={report.forecast.points} forecast />
          </>}
        </div>
      </div>
      <div style={grid}>
        <div className="card" style={panel}><h3>Sales by payment method</h3>
          {report.payments.length ? <ResponsiveContainer width="100%" height={230}>
            <BarChart data={report.payments}><CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" /><XAxis dataKey="name" /><YAxis width={70} tickFormatter={formatCurrencyShort} /><Tooltip formatter={formatChartCurrency} /><Bar dataKey="value" name="Sales" fill="#f97316" /></BarChart>
          </ResponsiveContainer> : <p>No payments in this period.</p>}
        </div>
        <div className="card" style={panel}><h3>Top selling products</h3>
          {!report.topProducts.length && <p>No products sold in this period.</p>}
          {report.topProducts.map(product => <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}><span>{product.name}</span><strong>{product.quantity} sold</strong></div>)}
        </div>
      </div>
      <div className="card" style={panel}><h3>Sales / Order history</h3>
        <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table"><thead><tr><th>Order No.</th><th>Date / time</th><th>Customer</th><th>Cashier</th><th>Items</th><th>Payment</th><th>Discount</th><th>Total</th></tr></thead>
            <tbody>{report.orders.slice(page * 20, (page + 1) * 20).map(sale => <tr key={sale.id}>
              <td>{sale.invoice_number}</td><td>{dateTime(sale.created_at)}</td>
              <td>{sale.customers?.phone || sale.customers?.full_name || 'Walk-in'}</td><td>{sale.users?.full_name || 'Not recorded'}</td>
              <td>{sale.sale_items?.map((item, i) => <div key={i}>{item.products?.name || 'Unavailable product'} × {item.quantity}</div>)}</td>
              <td>{sale.payment_method.replaceAll('_', ' ')}</td><td>{formatCurrency(sale.discount)}</td><td>{formatCurrency(sale.total)}</td>
            </tr>)}{!report.count && <tr><td colSpan={8}>No completed sales on the selected dates.</td></tr>}</tbody>
          </table>
        </div>
        {report.count > 20 && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1} of {Math.ceil(report.count / 20)}</span>
          <Button size="sm" variant="secondary" disabled={(page + 1) * 20 >= report.count} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>}
      </div>
    </>}
  </section>
}
