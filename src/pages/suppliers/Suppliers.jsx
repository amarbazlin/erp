import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Truck, MessageCircle, CheckCircle } from 'lucide-react'
import { supplierService } from '../../services/supplierService'
import { sendTextMessage, cleanPhoneNumber } from '../../services/whatsappService'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'

// ── Supplier form ─────────────────────────────────────────────────────────────
const SupplierForm = ({ initial = {}, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    supplier_name: '', contact_person: '', phone: '',
    email: '', address: '', average_delivery_days: 3, status: 'active',
    ...initial,
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Show the cleaned international format as a hint
  const cleanedPhone = form.phone ? cleanPhoneNumber(form.phone) : ''
  const phoneValid   = cleanedPhone.startsWith('94') && cleanedPhone.length === 11

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group">
          <label>Supplier Name *</label>
          <input className="input-base" value={form.supplier_name} onChange={set('supplier_name')} required />
        </div>
        <div className="form-group">
          <label>Contact Person</label>
          <input className="input-base" value={form.contact_person} onChange={set('contact_person')} />
        </div>

        {/* Phone — highlighted as critical for WhatsApp */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={12} />
            WhatsApp Phone Number
            <span style={{ fontSize: 10, background: '#fff7ed', color: '#f97316', padding: '1px 6px', borderRadius: 99, fontWeight: 700, border: '1px solid #fed7aa' }}>
              Required for reorders
            </span>
          </label>
          <input
            className="input-base"
            value={form.phone}
            onChange={set('phone')}
            placeholder="0771234567 or +94771234567"
            style={{ borderColor: form.phone && !phoneValid ? '#fca5a5' : undefined }}
          />
          {form.phone && (
            <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5,
              color: phoneValid ? '#16a34a' : '#dc2626' }}>
              {phoneValid
                ? <><CheckCircle size={11} /> WhatsApp ready: +{cleanedPhone}</>
                : <><span>⚠</span> Format not recognised — use 07XXXXXXXX or +94XXXXXXXXX</>
              }
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Email</label>
          <input className="input-base" type="email" value={form.email} onChange={set('email')} />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Address</label>
          <input className="input-base" value={form.address} onChange={set('address')} />
        </div>

        <div className="form-group">
          <label>Avg. Delivery Days</label>
          <input className="input-base" type="number" min="1" value={form.average_delivery_days} onChange={set('average_delivery_days')} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="input-base" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={saving} onClick={() => onSave(form)}>Save Supplier</Button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Suppliers = () => {
  const [suppliers,   setSuppliers]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [modalType,   setModalType]   = useState(null)
  const [selected,    setSelected]    = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [testingId,   setTestingId]   = useState(null)  // supplier id currently being test-messaged
  const [testResult,  setTestResult]  = useState({})    // { [id]: 'sent' | 'error' }

  const fetchSuppliers = () => {
    setLoading(true)
    supplierService.getAll({ search })
      .then(setSuppliers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSuppliers() }, [search])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      const payload = { ...form, average_delivery_days: parseInt(form.average_delivery_days) || 3 }
      if (modalType === 'edit') await supplierService.update(selected.id, payload)
      else await supplierService.create(payload)
      setModalType(null)
      fetchSuppliers()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this supplier?')) return
    await supplierService.delete(id)
    fetchSuppliers()
  }

  // Send a quick test WhatsApp message to verify the number works
  const handleTestWhatsApp = async (supplier) => {
    setTestingId(supplier.id)
    try {
      await sendTextMessage(
        supplier.phone,
        `Hi ${supplier.supplier_name}, this is a test message from ${import.meta.env.VITE_BUSINESS_NAME || 'HardwareAI'}. Your number is correctly registered in our system. ✅`
      )
      setTestResult(prev => ({ ...prev, [supplier.id]: 'sent' }))
    } catch (err) {
      setTestResult(prev => ({ ...prev, [supplier.id]: 'error: ' + err.message }))
    } finally {
      setTestingId(null)
    }
  }

  const withPhone    = suppliers.filter(s => s.phone)
  const withoutPhone = suppliers.filter(s => !s.phone)

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">
            {suppliers.length} suppliers · {withPhone.length} WhatsApp-enabled
          </p>
        </div>
        <Button icon={<Plus />} onClick={() => { setSelected(null); setModalType('add') }}>
          Add Supplier
        </Button>
      </div>

      {/* WhatsApp coverage banner */}
      {withoutPhone.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <MessageCircle size={16} color="#d97706" />
          <span style={{ color: '#92400e' }}>
            <strong>{withoutPhone.length} supplier{withoutPhone.length !== 1 ? 's' : ''}</strong> have no phone number — add their numbers to enable automatic WhatsApp reorder messages.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." width={280} />
      </div>

      {/* Summary row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Suppliers', value: suppliers.length, color: '#3b82f6' },
          { label: 'WhatsApp Enabled', value: withPhone.length, color: '#25D366' },
          { label: 'Missing Phone', value: withoutPhone.length, color: withoutPhone.length > 0 ? '#f59e0b' : '#22c55e' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: c.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier cards */}
      <div className="grid-3">
        {loading ? (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: 60 }}><Loader /></div>
        ) : suppliers.length === 0 ? (
          <div style={{ gridColumn: 'span 3' }}>
            <div className="empty-state">
              <Truck size={36} /><h3>No suppliers found</h3><p>Add your first supplier</p>
            </div>
          </div>
        ) : suppliers.map(s => {
          const cleanedPhone = s.phone ? cleanPhoneNumber(s.phone) : ''
          const phoneValid   = cleanedPhone.startsWith('94') && cleanedPhone.length === 11
          const tResult      = testResult[s.id]

          return (
            <div key={s.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
                    {s.supplier_name}
                  </h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 11, background: s.status === 'active' ? 'var(--success-bg)' : 'var(--content-bg)',
                      color: s.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                      padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                    }}>
                      {s.status}
                    </span>
                    {/* WhatsApp badge */}
                    {s.phone && (
                      <span style={{
                        fontSize: 11,
                        background: phoneValid ? '#f0fdf4' : '#fef2f2',
                        color: phoneValid ? '#16a34a' : '#dc2626',
                        padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <MessageCircle size={9} />
                        {phoneValid ? 'WhatsApp ✓' : 'Invalid format'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setSelected(s); setModalType('edit') }}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={12} color="var(--text-secondary)" />
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} color="var(--danger)" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {s.contact_person && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <span>👤</span>{s.contact_person}
                  </div>
                )}
                {s.phone ? (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Phone size={13} />{s.phone}
                    </div>
                    {/* Test WhatsApp button */}
                    {phoneValid && (
                      <button
                        onClick={() => handleTestWhatsApp(s)}
                        disabled={testingId === s.id}
                        title="Send a test WhatsApp message"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, padding: '3px 9px', borderRadius: 6,
                          border: '1px solid #bbf7d0',
                          background: tResult === 'sent' ? '#f0fdf4' : '#fff',
                          color: tResult === 'sent' ? '#16a34a' : tResult?.startsWith('error') ? '#dc2626' : '#25D366',
                          cursor: testingId === s.id ? 'not-allowed' : 'pointer',
                          fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        {testingId === s.id ? (
                          <Loader size={10} color="#25D366" />
                        ) : (
                          <MessageCircle size={10} />
                        )}
                        {tResult === 'sent' ? 'Sent ✓' : tResult?.startsWith('error') ? 'Failed' : 'Test'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#d97706', alignItems: 'center' }}>
                    <MessageCircle size={13} />
                    <span>No phone — <button onClick={() => { setSelected(s); setModalType('edit') }}
                      style={{ color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
                      Add number
                    </button></span>
                  </div>
                )}
                {s.email && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <Mail size={13} />{s.email}
                  </div>
                )}
                {s.address && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <MapPin size={13} />{s.address}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--card-border)' }}>
                  <Truck size={13} />
                  <span>Avg delivery: <strong style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{s.average_delivery_days} days</strong></span>
                </div>
              </div>

              {/* Test error message */}
              {tResult?.startsWith('error') && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
                  {tResult}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={!!modalType}
        onClose={() => setModalType(null)}
        title={modalType === 'edit' ? 'Edit Supplier' : 'Add Supplier'}
        width={560}
      >
        <SupplierForm
          initial={selected || {}}
          onSave={handleSave}
          onCancel={() => setModalType(null)}
          saving={saving}
        />
      </Modal>
    </div>
  )
}

export default Suppliers
