import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, User, Phone, CreditCard, ArrowRight, TrendingUp } from 'lucide-react'
import { useCustomers, useCustomerSummary } from '../../hooks/useCustomers'
import { customerService } from '../../services/customerService'
import { CreditStatusBadge, PricingTierBadge } from '../../components/delivery/DeliveryStatusBadge'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { formatRangeLabel } from '../../utils/dateRange'
import { pricingService } from '../../services/pricingService'
import { useEffect } from 'react'

const TYPE_COLORS = { retail: '#3b82f6', contractor: '#f97316', wholesale: '#8b5cf6', vip: '#22c55e' }

const CustomerForm = ({ initial = {}, tiers = [], onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '',
    customer_type: 'retail', credit_limit: 0,
    price_tier_id: '', notes: '', status: 'active', ...initial,
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group"><label>Full Name *</label><input className="input-base" value={form.name} onChange={set('name')} required /></div>
        <div className="form-group"><label>Phone</label><input className="input-base" value={form.phone} onChange={set('phone')} placeholder="07XXXXXXXX" /></div>
        <div className="form-group"><label>Email</label><input className="input-base" type="email" value={form.email} onChange={set('email')} /></div>
        <div className="form-group"><label>Customer Type</label>
          <select className="input-base" value={form.customer_type} onChange={set('customer_type')}>
            <option value="retail">Retail</option>
            <option value="contractor">Contractor</option>
            <option value="wholesale">Wholesale</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <div className="form-group"><label>Credit Limit (Rs.)</label><input className="input-base" type="number" min="0" value={form.credit_limit} onChange={set('credit_limit')} placeholder="0 = cash only" /></div>
        <div className="form-group"><label>Price Tier</label>
          <select className="input-base" value={form.price_tier_id} onChange={set('price_tier_id')}>
            <option value="">Default pricing</option>
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name} (−{t.discount_percent}%)</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Address</label><input className="input-base" value={form.address} onChange={set('address')} /></div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Notes</label><input className="input-base" value={form.notes} onChange={set('notes')} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={saving} onClick={() => onSave(form)}>Save Customer</Button>
      </div>
    </div>
  )
}

const Customers = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalType, setModalType] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tiers, setTiers] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const dateFilter = useDateRangeFilter({ defaultDays: 90 })

  const { customers, loading, refetch } = useCustomers({
    search,
    type: typeFilter || null,
    ...dateFilter.apiParams,
  })
  const { summary } = useCustomerSummary()

  useEffect(() => { pricingService.getTiers().then(setTiers).catch(console.error) }, [])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      const payload = { ...form, credit_limit: parseFloat(form.credit_limit) || 0, price_tier_id: form.price_tier_id || null }
      if (modalType === 'edit') await customerService.update(selected.id, payload)
      else await customerService.create(payload)
      setModalType(null)
      refetch()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return alert('Enter a valid amount')
    setPaying(true)
    try {
      await customerService.recordPayment({ customerId: payModal.id, amount: parseFloat(payAmount), method: payMethod })
      setPayModal(null)
      setPayAmount('')
      refetch()
    } catch (err) { alert(err.message) }
    finally { setPaying(false) }
  }

  const totalOutstanding = customers.reduce((s, c) => s + (parseFloat(c.current_balance) || 0), 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} · {formatCurrencyShort(totalOutstanding)} outstanding
            {dateFilter.isActive && ` · added ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)}`}
          </p>
        </div>
        <div className="page-header-actions">
          <Button icon={<Plus />} onClick={() => { setSelected(null); setModalType('add') }} fullWidth>Add Customer</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Customers', value: summary?.total || 0, color: '#3b82f6' },
          { label: 'Total Outstanding', value: formatCurrencyShort(summary?.totalOutstanding || 0), color: '#f97316' },
          { label: 'Over Credit Limit', value: summary?.overLimit || 0, color: '#ef4444' },
          { label: 'Credit Customers', value: customers.filter(c => c.credit_limit > 0).length, color: '#22c55e' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card filter-toolbar" style={{ padding: '12px 20px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers…" width={260} />
        <select className="input-base" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 160, minWidth: 130 }}>
          <option value="">All types</option>
          <option value="retail">Retail</option>
          <option value="contractor">Contractor</option>
          <option value="wholesale">Wholesale</option>
          <option value="vip">VIP</option>
        </select>
        <DateRangeFilter
          open={dateFilter.open}
          onToggle={dateFilter.openPanel}
          startDate={dateFilter.draftStart}
          endDate={dateFilter.draftEnd}
          onStartChange={dateFilter.setDraftStart}
          onEndChange={dateFilter.setDraftEnd}
          onApply={dateFilter.apply}
          onClear={dateFilter.clear}
          isActive={dateFilter.isActive}
          appliedStart={dateFilter.applied?.startDate}
          appliedEnd={dateFilter.applied?.endDate}
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Type</th>
              <th>Price Tier</th>
              <th>Credit Limit</th>
              <th>Credit Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><User size={36} /><h3>No customers</h3><p>Add your first customer</p></div></td></tr>
            ) : customers.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${TYPE_COLORS[c.customer_type] || '#6b7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: TYPE_COLORS[c.customer_type] || '#6b7280', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}>
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                        {c.phone && <span><Phone size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{c.phone}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontSize: 12, background: `${TYPE_COLORS[c.customer_type]}18`, color: TYPE_COLORS[c.customer_type], padding: '2px 9px', borderRadius: 99, fontWeight: 600, textTransform: 'capitalize' }}>{c.customer_type}</span></td>
                <td><PricingTierBadge tier={c.price_tiers} /></td>
                <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13 }}>{c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '—'}</td>
                <td style={{ minWidth: 180 }}><CreditStatusBadge creditLimit={c.credit_limit} currentBalance={c.current_balance} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.current_balance > 0 && (
                      <button onClick={() => { setPayModal(c); setPayAmount('') }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        + Payment
                      </button>
                    )}
                    <button onClick={() => navigate(`/customers/${c.id}`)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowRight size={13} color="var(--text-secondary)" />
                    </button>
                    <button onClick={() => { setSelected(c); setModalType('edit') }} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add/Edit modal */}
      <Modal open={!!modalType} onClose={() => setModalType(null)} title={modalType === 'edit' ? 'Edit Customer' : 'Add Customer'} width={580}>
        <CustomerForm initial={selected || {}} tiers={tiers} onSave={handleSave} onCancel={() => setModalType(null)} saving={saving} />
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.name}`} width={400}
        footer={<><Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button><Button loading={paying} onClick={handleRecordPayment}>Record Payment</Button></>}>
        {payModal && (
          <div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              Outstanding balance: <strong style={{ fontFamily: 'Outfit, sans-serif', color: '#f97316' }}>{formatCurrency(payModal.current_balance)}</strong>
            </div>
            <div className="form-group"><label>Payment Amount (Rs.) *</label>
              <input className="input-base" type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div className="form-group"><label>Payment Method</label>
              <select className="input-base" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Customers
