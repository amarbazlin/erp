import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { financeService } from '../../services/financeService'
import { financeDefaultRange } from '../../utils/financeReporting'
import { businessDay, dayBounds, shiftDay } from '../../utils/salesReporting'
import { formatCurrency, formatCurrencyShort, formatChartCurrency } from '../../utils/formatters'
import Button from '../../components/shared/Button'
import Modal from '../../components/shared/Modal'
import Loader from '../../components/shared/Loader'

const panel = { padding: 20, marginBottom: 20, minWidth: 0 }
const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }

export default function Finance() {
  const [range, setRange] = useState(financeDefaultRange)
  const [draft, setDraft] = useState(range)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [target, setTarget] = useState(null)
  const [page, setPage] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setReport(null); setPage(0)
    financeService.getReport(range.start, range.end).then(data => { if (active) setReport(data) })
      .catch(err => { if (active) setError(err.message || 'Unable to load finance.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [range, version])
  const apply = next => {
    try { dayBounds(next.start, next.end); setError(''); setDraft(next); setRange({ ...next }) }
    catch (err) { setError(err.message) }
  }
  const openForm = entry => { setFormError(''); setForm(entry); setNotice('') }
  const add = type => openForm({ type, category: '', amount: '', description: '', date: businessDay() })
  const save = async event => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setFormError('')
    try {
      await financeService.save(form)
      setForm(null); setNotice('Entry saved. Totals reflect the selected dates.'); setVersion(v => v + 1)
    } catch (err) { setFormError(err.message || 'Could not save entry.') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    setSaving(true); setFormError('')
    try {
      await financeService.delete(target)
      setTarget(null); setNotice('Entry deleted.'); setVersion(v => v + 1)
    } catch (err) { setFormError(err.message || 'Could not delete entry.') }
    finally { setSaving(false) }
  }
  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))
  return <div className="page-wrapper">
    <div className="page-header"><div><h1 className="page-title">Finance</h1><p className="page-subtitle">Income and expenses · Sri Lankan business dates · LKR</p></div>
      <div style={row}><Button onClick={() => add('income')}>Add income</Button><Button variant="secondary" onClick={() => add('expense')}>Add expense</Button></div>
    </div>
    <div className="card" style={panel}>
      <div style={row}>
        <Button variant="secondary" onClick={() => apply({ start: businessDay(), end: businessDay() })}>Today</Button>
        <Button variant="secondary" onClick={() => apply({ start: shiftDay(businessDay(), -1), end: shiftDay(businessDay(), -1) })}>Yesterday</Button>
        <Button variant="secondary" onClick={() => apply(financeDefaultRange())}>30 days</Button>
        <label>From<input className="input-base" type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label>
        <label>To<input className="input-base" type="date" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></label>
        <Button onClick={() => apply(draft)}>Apply</Button><Button variant="secondary" onClick={() => setVersion(v => v + 1)}>Refresh</Button>
      </div>
    </div>
    {notice && <p role="status" style={{ color: 'var(--success)' }}>{notice}</p>}
    {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
    {loading && <Loader />}
    {report && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 16 }}>
        {Object.entries({ 'POS sales': report.sales, 'Other income': report.otherIncome, 'Total income': report.totalIncome, 'Recorded expenses': report.expenses, 'Income minus expenses': report.balance }).map(([label, value]) =>
          <div key={label} className="card" style={panel}><div className="page-subtitle">{label}</div><strong style={{ fontSize: 24, fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(value)}</strong></div>)}
      </div>
      <p className="page-subtitle">POS sales are included automatically (completed orders, including tax). Do not enter them again as other income. This balance is not net profit or a bank balance; ingredient costs, refunds, and purchases are not automatically posted as expenses.</p>
      <div className="card" style={panel}><h3>Daily income and expenses</h3>
        <ResponsiveContainer width="100%" height={280}><BarChart data={report.daily}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" /><XAxis dataKey="date" tickFormatter={v => v.slice(5)} tick={{ fontSize: 11 }} />
          <YAxis width={70} tickFormatter={formatCurrencyShort} /><Tooltip formatter={formatChartCurrency} /><Legend />
          <Bar dataKey="sales" name="POS sales" stackId="income" fill="#f97316" /><Bar dataKey="income" name="Other income" stackId="income" fill="#22c55e" /><Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
        </BarChart></ResponsiveContainer>
      </div>
      <div className="card" style={panel}>
        <h3>Manual income and expense entries</h3>
        <p className="page-subtitle">POS order details remain on the Dashboard. Only manually recorded entries can be edited here.</p>
        <div className="table-scroll-wrapper"><table className="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Label / description</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>{report.entries.length === 0 ? <tr><td colSpan={5}>No manual entries for these dates.</td></tr> : report.entries.slice(page * 20, (page + 1) * 20).map(entry =>
            <tr key={`${entry.type}-${entry.id}`}>
              <td>{entry.date}</td><td>{entry.type === 'income' ? 'Income' : 'Expense'}</td>
              <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}><strong>{entry.category}</strong><div>{entry.description}</div></td>
              <td>{formatCurrency(entry.amount)}</td>
              <td><div style={row}><Button size="sm" variant="secondary" onClick={() => openForm(entry)}>Edit</Button><Button size="sm" variant="danger" onClick={() => { setFormError(''); setTarget(entry) }}>Delete</Button></div></td>
            </tr>)}</tbody>
        </table></div>
        {report.entries.length > 20 && <div style={{ ...row, marginTop: 16 }}>
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1} of {Math.ceil(report.entries.length / 20)}</span>
          <Button variant="secondary" disabled={(page + 1) * 20 >= report.entries.length} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>}
      </div>
    </>}
    <Modal open={!!form} onClose={() => { if (!saving) setForm(null) }} title={`${form?.id ? 'Edit' : 'Add'} ${form?.type || 'entry'}`}>
      {form && <form onSubmit={save}>
        <div className="form-group"><label htmlFor="finance-label">Label *</label><input id="finance-label" className="input-base" value={form.category} onChange={set('category')} maxLength={100} placeholder={form.type === 'income' ? 'e.g. Catering income' : 'e.g. Rent, utilities, supplies'} required disabled={saving} /></div>
        <div className="form-group"><label htmlFor="finance-amount">Amount (LKR) *</label><input id="finance-amount" className="input-base" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.amount} onChange={set('amount')} required disabled={saving} /></div>
        <div className="form-group"><label htmlFor="finance-date">Date *</label><input id="finance-date" className="input-base" type="date" value={form.date} onChange={set('date')} required disabled={saving} /></div>
        <div className="form-group"><label htmlFor="finance-description">Description / reference</label><textarea id="finance-description" className="input-base" value={form.description || ''} onChange={set('description')} rows={3} disabled={saving} /></div>
        {formError && <p role="alert" style={{ color: 'var(--danger)' }}>{formError}</p>}
        <div style={row}><Button type="submit" loading={saving}>Save entry</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => setForm(null)}>Cancel</Button></div>
      </form>}
    </Modal>
    <Modal open={!!target} onClose={() => { if (!saving) setTarget(null) }} title="Delete entry">
      <p>Delete {target?.category} ({formatCurrency(target?.amount || 0)})? This cannot be undone.</p>
      {formError && <p role="alert" style={{ color: 'var(--danger)' }}>{formError}</p>}
      <div style={row}><Button variant="danger" loading={saving} onClick={remove}>Delete entry</Button><Button variant="secondary" disabled={saving} onClick={() => setTarget(null)}>Cancel</Button></div>
    </Modal>
  </div>
}

