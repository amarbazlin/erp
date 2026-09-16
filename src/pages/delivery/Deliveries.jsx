import React, { useState } from 'react'
import { Plus, Truck, Camera, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useDeliveries } from '../../hooks/useDeliveries'
import { deliveryService } from '../../services/deliveryService'
import { DeliveryStatusBadge, DeliveryNoteButton } from '../../components/delivery/DeliveryStatusBadge'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatDate, formatCurrencyShort } from '../../utils/formatters'
import DateRangeFilter from '../../components/shared/DateRangeFilter'
import { useDateRangeFilter } from '../../hooks/useDateRangeFilter'
import { formatRangeLabel } from '../../utils/dateRange'
import SearchBar from '../../components/shared/SearchBar'
import { useAuth } from '../../context/AuthContext'

const STATUS_FLOW = { pending: 'dispatched', dispatched: 'delivered' }
const STATUS_LABELS = { pending: 'Mark Dispatched', dispatched: 'Mark Delivered' }

const Deliveries = () => {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const dateFilter = useDateRangeFilter({ defaultDays: 30 })
  const { deliveries, loading, summary, refetch } = useDeliveries({
    status: statusFilter || null,
    ...dateFilter.apiParams,
  })
  const [detailModal, setDetailModal]     = useState(null)
  const [updatingId,  setUpdatingId]      = useState(null)
  const [proofFile,   setProofFile]       = useState(null)
  const [uploadingId, setUploadingId]     = useState(null)

  const handleStatusUpdate = async (delivery) => {
    const nextStatus = STATUS_FLOW[delivery.status]
    if (!nextStatus) return
    setUpdatingId(delivery.id)
    try {
      await deliveryService.updateStatus(delivery.id, nextStatus)
      refetch()
    } catch (err) { alert(err.message) }
    finally { setUpdatingId(null) }
  }

  const handleProofUpload = async (deliveryId) => {
    if (!proofFile) return
    setUploadingId(deliveryId)
    try {
      await deliveryService.uploadProof(deliveryId, proofFile)
      await deliveryService.updateStatus(deliveryId, 'delivered')
      setDetailModal(null)
      setProofFile(null)
      refetch()
    } catch (err) { alert(err.message) }
    finally { setUploadingId(null) }
  }

  const STATUS_COLORS = { pending: '#d97706', dispatched: '#2563eb', delivered: '#16a34a', failed: '#dc2626', cancelled: '#6b7280' }

  const filtered = deliveries.filter(d =>
    d.delivery_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deliveries</h1>
          <p className="page-subtitle">
            {filtered.length} total · {summary?.pending || 0} pending · {summary?.dispatched || 0} on the way
            {dateFilter.isActive && ` · ${formatRangeLabel(dateFilter.applied.startDate, dateFilter.applied.endDate)}`}
          </p>
        </div>
      </div>

      <div className="card filter-toolbar" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search deliveries…" width={260} />
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

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ key: '', label: 'All', count: deliveries.length }, { key: 'pending', label: 'Pending', count: summary?.pending || 0 }, { key: 'dispatched', label: 'Dispatched', count: summary?.dispatched || 0 }, { key: 'delivered', label: 'Delivered', count: summary?.delivered || 0 }, { key: 'failed', label: 'Failed', count: summary?.failed || 0 }].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)} style={{ padding: '7px 16px', borderRadius: 9, border: `1.5px solid ${statusFilter === s.key ? 'var(--accent)' : 'var(--card-border)'}`, background: statusFilter === s.key ? '#fff7ed' : 'var(--card-bg)', color: statusFilter === s.key ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 7 }}>
            {s.label}
            <span style={{ background: statusFilter === s.key ? 'var(--accent)' : 'var(--content-bg)', color: statusFilter === s.key ? '#fff' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Delivery #</th>
              <th>Customer</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><Loader /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><Truck size={36} /><h3>No deliveries</h3><p>Deliveries are created from sales</p></div></td></tr>
            ) : filtered.map(d => (
              <tr key={d.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{d.delivery_number}</span></td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.customers?.name || '—'}</div>
                  {d.customers?.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.customers.phone}</div>}
                </td>
                <td style={{ fontSize: 12.5 }}>{d.driver_name || '—'}</td>
                <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.vehicle_number || '—'}</td>
                <td style={{ fontSize: 12.5 }}>{d.scheduled_date ? formatDate(d.scheduled_date, 'dd MMM') : '—'}</td>
                <td><DeliveryStatusBadge status={d.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_FLOW[d.status] && (
                      <button
                        onClick={() => handleStatusUpdate(d)}
                        disabled={updatingId === d.id}
                        style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${STATUS_COLORS[STATUS_FLOW[d.status]]}40`, background: `${STATUS_COLORS[STATUS_FLOW[d.status]]}10`, color: STATUS_COLORS[STATUS_FLOW[d.status]], fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: updatingId === d.id ? 0.6 : 1 }}
                      >
                        {updatingId === d.id ? '…' : STATUS_LABELS[d.status]}
                      </button>
                    )}
                    {d.status === 'dispatched' && (
                      <button onClick={() => setDetailModal(d)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Camera size={12} /> Proof
                      </button>
                    )}
                    <DeliveryNoteButton delivery={d} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Proof of delivery modal */}
      <Modal open={!!detailModal} onClose={() => { setDetailModal(null); setProofFile(null) }} title="Upload Proof of Delivery" width={420}
        footer={<><Button variant="secondary" onClick={() => { setDetailModal(null); setProofFile(null) }}>Cancel</Button><Button loading={uploadingId === detailModal?.id} onClick={() => handleProofUpload(detailModal?.id)} disabled={!proofFile}>Confirm Delivered</Button></>}>
        {detailModal && (
          <div>
            <div style={{ fontSize: 13.5, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Take or upload a photo as proof of delivery for <strong>{detailModal.delivery_number}</strong>.
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={e => setProofFile(e.target.files?.[0] || null)}
              style={{ display: 'block', width: '100%', padding: '10px', border: '1.5px dashed var(--card-border)', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'var(--content-bg)' }} />
            {proofFile && (
              <div style={{ marginTop: 12 }}>
                <img src={URL.createObjectURL(proofFile)} alt="proof" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              This will mark the delivery as Delivered and save the photo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Deliveries
