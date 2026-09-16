import React, { useState } from 'react'
import { Truck } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import { formatDate } from '../../utils/formatters'
import { DeliveryStatusBadge } from './DeliveryStatusBadge'

const CreateTripModal = ({ open, deliveries, onClose, onCreate, loading }) => {
  const [selected, setSelected]     = useState([])
  const [tripDate, setTripDate]     = useState(new Date().toISOString().slice(0, 10))
  const [driverName, setDriverName] = useState('')
  const [vehicle, setVehicle]       = useState('')
  const [notes, setNotes]           = useState('')

  const eligible = (deliveries || []).filter(d =>
    ['pending', 'packed'].includes(d.status) && !d.dispatch_trip_id
  )

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleClose = () => {
    setSelected([])
    setDriverName('')
    setVehicle('')
    setNotes('')
    onClose()
  }

  const handleCreate = () => {
    onCreate({ deliveryIds: selected, tripDate, driverName, vehicleNumber: vehicle, notes })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Dispatch Trip"
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={loading} onClick={handleCreate} disabled={selected.length === 0}>
            Create Trip ({selected.length} orders)
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Group multiple orders into one delivery trip. Select orders below.
      </p>

      <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
        <div className="form-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Trip Date</label>
          <input type="date" className="input-base" value={tripDate} onChange={e => setTripDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Driver Name</label>
          <input type="text" className="input-base" placeholder="Optional" value={driverName} onChange={e => setDriverName(e.target.value)} />
        </div>
        <div className="form-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Vehicle</label>
          <input type="text" className="input-base" placeholder="e.g. CAB-1234" value={vehicle} onChange={e => setVehicle(e.target.value)} />
        </div>
        <div className="form-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Notes</label>
          <input type="text" className="input-base" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {eligible.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <Truck size={32} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No unassigned orders available</p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {eligible.map(d => (
            <label
              key={d.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 9, border: `1.5px solid ${selected.includes(d.id) ? 'var(--accent)' : 'var(--card-border)'}`,
                background: selected.includes(d.id) ? '#fff7ed' : 'var(--content-bg)',
                cursor: 'pointer',
              }}
            >
              <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} style={{ accentColor: 'var(--accent)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.customers?.name || '—'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {d.delivery_number} · {d.scheduled_date ? formatDate(d.scheduled_date, 'dd MMM') : 'No date'}
                </div>
              </div>
              <DeliveryStatusBadge status={d.status} />
            </label>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default CreateTripModal
