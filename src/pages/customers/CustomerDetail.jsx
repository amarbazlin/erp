import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, ShoppingCart, TrendingUp } from 'lucide-react'
import { customerService } from '../../services/customerService'
import { CreditStatusBadge } from '../../components/delivery/DeliveryStatusBadge'
import { generateInvoicePDF } from '../../services/invoiceService'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency, formatCurrencyShort, formatDate } from '../../utils/formatters'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('sales')

  useEffect(() => {
    customerService.getById(id)
      .then(setCustomer)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><Loader size={36} /></div>
  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Customer not found</div>

  const totalPurchased = (customer.sales || []).reduce((s, sale) => s + parseFloat(sale.total_amount || 0), 0)
  const totalPaid = (customer.customer_payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const TABS = [
    { key: 'sales',    label: `Sales (${customer.sales?.length || 0})` },
    { key: 'payments', label: `Payments (${customer.customer_payments?.length || 0})` },
  ]

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={() => navigate('/customers')} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{customer.customer_type} customer · since {formatDate(customer.created_at, 'MMM yyyy')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Left: info card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#f97316', fontFamily: 'Outfit, sans-serif', marginBottom: 14 }}>
              {customer.name?.charAt(0)?.toUpperCase()}
            </div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{customer.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {customer.phone   && <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}><Phone size={14} />{customer.phone}</div>}
              {customer.email   && <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}><Mail size={14} />{customer.email}</div>}
              {customer.address && <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}><MapPin size={14} />{customer.address}</div>}
            </div>
            {customer.notes && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--content-bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {customer.notes}
              </div>
            )}
          </div>

          {/* Credit box */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Credit Account</h3>
            <CreditStatusBadge creditLimit={customer.credit_limit} currentBalance={customer.current_balance} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              {[
                { label: 'Credit Limit', value: formatCurrency(customer.credit_limit || 0) },
                { label: 'Outstanding',  value: formatCurrency(customer.current_balance || 0), danger: customer.current_balance > 0 },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--content-bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 15, color: s.danger ? '#f97316' : 'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Account Summary</h3>
            {[
              { label: 'Total Purchased', value: formatCurrencyShort(totalPurchased), color: '#f97316' },
              { label: 'Total Paid',      value: formatCurrencyShort(totalPaid),      color: '#22c55e' },
              { label: 'Transactions',    value: customer.sales?.length || 0,         color: '#3b82f6' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <strong style={{ color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Right: tabs */}
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 4 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#fff7ed' : 'transparent', color: tab === t.key ? '#f97316' : 'var(--text-muted)', transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>

          {tab === 'sales' && (
            <div className="card">
              <table className="data-table">
                <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Payment</th><th></th></tr></thead>
                <tbody>
                  {(customer.sales || []).length === 0 ? (
                    <tr><td colSpan={5}><div className="empty-state" style={{ padding: 32 }}><ShoppingCart size={32} /><p>No sales yet</p></div></td></tr>
                  ) : [...(customer.sales || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(sale => (
                    <tr key={sale.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600 }}>{sale.invoice_number}</span></td>
                      <td style={{ fontSize: 12.5 }}>{formatDate(sale.created_at)}</td>
                      <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#f97316' }}>{formatCurrency(sale.total_amount)}</td>
                      <td><span style={{ fontSize: 11.5, background: sale.is_credit ? '#fff7ed' : '#f0fdf4', color: sale.is_credit ? '#f97316' : '#16a34a', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{sale.is_credit ? 'Credit' : sale.payment_method}</span></td>
                      <td><button onClick={() => generateInvoicePDF({ ...sale, customers: customer })} style={{ fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↓ PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'payments' && (
            <div className="card">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
                <tbody>
                  {(customer.customer_payments || []).length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state" style={{ padding: 32 }}><CreditCard size={32} /><p>No payments recorded</p></div></td></tr>
                  ) : [...(customer.customer_payments || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12.5 }}>{formatDate(p.created_at)}</td>
                      <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#22c55e' }}>{formatCurrency(p.amount)}</td>
                      <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{p.method || '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail
