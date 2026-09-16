import React, { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Truck, Package, AlertTriangle, CheckCircle2,
  RotateCcw, Plus, Users, Route,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useRBAC } from '../../context/RBACContext'
import { P } from '../../utils/permissions'
import {
  deliveryService, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS,
} from '../../services/deliveryService'
import { DeliveryStatusBadge, DeliveryNoteButton } from '../../components/delivery/DeliveryStatusBadge'
import { LocationSelect } from '../../components/delivery/DeliveryStatusBadge'
import ProofOfDeliveryModal from '../../components/delivery/ProofOfDeliveryModal'
import CreateTripModal from '../../components/delivery/CreateTripModal'
import Loader from '../../components/shared/Loader'
import Button from '../../components/shared/Button'
import { formatDate } from '../../utils/formatters'

const DISPATCH_VIEWS = [
  { key: 'today',     label: 'Today',     icon: Truck,          color: '#f97316' },
  { key: 'delayed',   label: 'Delayed',   icon: AlertTriangle,  color: '#dc2626' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2,   color: '#16a34a' },
]

const VIEW_MODES = [
  { key: 'list',     label: 'All Orders', icon: ClipboardList },
  { key: 'customer', label: 'By Customer', icon: Users },
  { key: 'trip',     label: 'By Trip',    icon: Route },
]

const STATUS_FILTERS = [
  { key: '',           label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'packed',     label: 'Packed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'returned',   label: 'Returned' },
]

const STATUS_ACTION_COLORS = {
  packed: '#7c3aed', dispatched: '#2563eb', delivered: '#16a34a',
}

const OrderTracking = () => {
  const { user }  = useAuth()
  const { can }   = useRBAC()
  const canManage = can(P.MANAGE_DELIVERIES)

  const [loading, setLoading]         = useState(true)
  const [deliveries, setDeliveries]   = useState([])
  const [trips, setTrips]             = useState([])
  const [summary, setSummary]         = useState(null)
  const [dispatchView, setDispatchView] = useState('today')
  const [viewMode, setViewMode]       = useState('list')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationId, setLocationId]   = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const [updatingId, setUpdatingId]   = useState(null)
  const [proofModal, setProofModal]   = useState(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [tripModal, setTripModal]     = useState(false)
  const [tripLoading, setTripLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [all, sum, tripData] = await Promise.all([
        deliveryService.getAll({ locationId }),
        deliveryService.getSummary(),
        deliveryService.getTrips(),
      ])
      setDeliveries(all || [])
      setSummary(sum)
      setTrips(tripData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const dispatchList = deliveries.filter(d => {
    const today = selectedDate
    if (dispatchView === 'today') {
      return d.scheduled_date === today && !['delivered', 'returned', 'cancelled'].includes(d.status)
    }
    if (dispatchView === 'delayed') {
      return d.scheduled_date && d.scheduled_date < today && !['delivered', 'returned', 'cancelled'].includes(d.status)
    }
    if (dispatchView === 'completed') {
      return d.status === 'delivered' && d.delivered_at?.startsWith(today)
    }
    return true
  })

  const completedCount = deliveries.filter(d =>
    d.status === 'delivered' && d.delivered_at?.startsWith(selectedDate)
  ).length

  const filtered = (viewMode === 'list' ? dispatchList : deliveries).filter(d =>
    !statusFilter || d.status === statusFilter
  )

  const customerGroups = deliveryService.groupByCustomer(filtered)

  const handleStatusUpdate = async (delivery) => {
    const next = ORDER_STATUS_FLOW[delivery.status]
    if (!next || !canManage) return
    if (next === 'delivered') {
      setProofModal(delivery)
      return
    }
    setUpdatingId(delivery.id)
    try {
      await deliveryService.updateStatus(delivery.id, next, { userId: user?.id })
      fetchAll()
    } catch (err) { alert(err.message) }
    finally { setUpdatingId(null) }
  }

  const handleMarkReturned = async (delivery) => {
    if (!canManage) return
    if (!window.confirm(`Mark ${delivery.delivery_number} as returned?`)) return
    setUpdatingId(delivery.id)
    try {
      await deliveryService.markReturned(delivery.id, { userId: user?.id })
      fetchAll()
    } catch (err) { alert(err.message) }
    finally { setUpdatingId(null) }
  }

  const handleProofConfirm = async (payload) => {
    setProofLoading(true)
    try {
      await deliveryService.confirmDelivery(proofModal.id, { ...payload, userId: user?.id })
      setProofModal(null)
      fetchAll()
    } catch (err) { alert(err.message) }
    finally { setProofLoading(false) }
  }

  const handleCreateTrip = async (data) => {
    setTripLoading(true)
    try {
      await deliveryService.createTrip({ ...data, createdBy: user?.id })
      setTripModal(false)
      fetchAll()
    } catch (err) { alert(err.message) }
    finally { setTripLoading(false) }
  }

  const renderActions = (d) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {canManage && ORDER_STATUS_FLOW[d.status] && (
        <button
          onClick={() => handleStatusUpdate(d)}
          disabled={updatingId === d.id}
          style={{
            padding: '5px 10px', borderRadius: 7,
            border: `1px solid ${STATUS_ACTION_COLORS[ORDER_STATUS_FLOW[d.status]] || 'var(--accent)'}40`,
            background: `${STATUS_ACTION_COLORS[ORDER_STATUS_FLOW[d.status]] || 'var(--accent)'}10`,
            color: STATUS_ACTION_COLORS[ORDER_STATUS_FLOW[d.status]] || 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', opacity: updatingId === d.id ? 0.6 : 1,
          }}
        >
          {updatingId === d.id ? '…' : ORDER_STATUS_LABELS[d.status]}
        </button>
      )}
      {canManage && d.status === 'dispatched' && (
        <button
          onClick={() => setProofModal(d)}
          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          Proof
        </button>
      )}
      {canManage && ['dispatched', 'delivered'].includes(d.status) && (
        <button
          onClick={() => handleMarkReturned(d)}
          disabled={updatingId === d.id}
          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <RotateCcw size={11} /> Return
        </button>
      )}
      <DeliveryNoteButton delivery={d} />
    </div>
  )

  const renderOrderRow = (d) => (
    <tr key={d.id}>
      <td><span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{d.delivery_number}</span></td>
      <td>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.customers?.name || '—'}</div>
        {d.customers?.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.customers.phone}</div>}
      </td>
      <td style={{ fontSize: 12.5 }}>{d.sales?.invoice_number || '—'}</td>
      <td style={{ fontSize: 12.5 }}>{d.scheduled_date ? formatDate(d.scheduled_date, 'dd MMM') : '—'}</td>
      <td style={{ fontSize: 12 }}>{d.dispatch_trips?.trip_number || '—'}</td>
      <td><DeliveryStatusBadge status={d.status} /></td>
      <td>{renderActions(d)}</td>
    </tr>
  )

  const renderMobileCard = (d) => (
    <div key={d.id} className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{d.delivery_number}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{d.customers?.name || '—'}</div>
        </div>
        <DeliveryStatusBadge status={d.status} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        <span>Invoice: {d.sales?.invoice_number || '—'}</span>
        <span>Date: {d.scheduled_date ? formatDate(d.scheduled_date, 'dd MMM') : '—'}</span>
        {d.dispatch_trips?.trip_number && <span>Trip: {d.dispatch_trips.trip_number}</span>}
      </div>
      {renderActions(d)}
    </div>
  )

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Order Tracking</h1>
          <p className="page-subtitle">Forgera Dispatch · {deliveries.length} orders · {summary?.today || 0} due today · {summary?.delayed || 0} delayed</p>
        </div>
        {canManage && (
          <Button onClick={() => setTripModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Trip
          </Button>
        )}
      </div>

      {/* Dispatch summary cards */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {DISPATCH_VIEWS.map(v => {
          const Icon = v.icon
          const count = v.key === 'today' ? (summary?.today || 0)
            : v.key === 'delayed' ? (summary?.delayed || 0)
            : completedCount
          const active = dispatchView === v.key
          return (
            <button
              key={v.key}
              onClick={() => { setDispatchView(v.key); setViewMode('list') }}
              style={{
                padding: '16px 18px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                border: `1.5px solid ${active ? v.color : 'var(--card-border)'}`,
                background: active ? `${v.color}08` : 'var(--card-bg)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${v.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={v.color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>{v.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: v.color, fontFamily: 'Outfit, sans-serif' }}>{count}</div>
            </button>
          )
        })}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          className="input-base"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        />
        <LocationSelect value={locationId} onChange={setLocationId} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {VIEW_MODES.map(m => {
            const Icon = m.icon
            const active = viewMode === m.key
            return (
              <button
                key={m.key}
                onClick={() => setViewMode(m.key)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--card-border)'}`,
                  background: active ? '#fff7ed' : 'var(--card-bg)',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <Icon size={13} /> {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(s => {
          const count = s.key ? (summary?.[s.key] || 0) : deliveries.length
          const active = statusFilter === s.key
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              style={{
                padding: '6px 14px', borderRadius: 9,
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--card-border)'}`,
                background: active ? '#fff7ed' : 'var(--card-bg)',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {s.label}
              <span style={{ background: active ? 'var(--accent)' : 'var(--content-bg)', color: active ? '#fff' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader /></div>
      ) : viewMode === 'customer' ? (
        /* Customer-wise batches */
        customerGroups.length === 0 ? (
          <div className="card"><div className="empty-state"><Users size={36} /><h3>No orders</h3><p>Orders appear here when created from sales</p></div></div>
        ) : customerGroups.map(group => (
          <div key={group.customerId} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{group.customerName}</div>
                {group.customerPhone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.customerPhone}</div>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: '#fff7ed', padding: '3px 10px', borderRadius: 99 }}>
                {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="hide-mobile">
              <table className="data-table">
                <thead><tr><th>Order #</th><th>Invoice</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{group.orders.map(d => (
                  <tr key={d.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{d.delivery_number}</span></td>
                    <td style={{ fontSize: 12.5 }}>{d.sales?.invoice_number || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{d.scheduled_date ? formatDate(d.scheduled_date, 'dd MMM') : '—'}</td>
                    <td><DeliveryStatusBadge status={d.status} /></td>
                    <td>{renderActions(d)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="show-mobile" style={{ padding: '10px 12px' }}>
              {group.orders.map(renderMobileCard)}
            </div>
          </div>
        ))
      ) : viewMode === 'trip' ? (
        /* Trip grouping */
        trips.length === 0 ? (
          <div className="card"><div className="empty-state"><Route size={36} /><h3>No dispatch trips</h3><p>Create a trip to group orders for delivery</p></div></div>
        ) : trips.map(trip => {
          const tripOrders = deliveries.filter(d => d.dispatch_trip_id === trip.id)
          const displayOrders = statusFilter ? tripOrders.filter(d => d.status === statusFilter) : tripOrders
          if (displayOrders.length === 0 && statusFilter) return null
          return (
            <div key={trip.id} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{trip.trip_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(trip.trip_date, 'dd MMM yyyy')}
                    {trip.driver_name && ` · ${trip.driver_name}`}
                    {trip.vehicle_number && ` · ${trip.vehicle_number}`}
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-muted)', background: 'var(--content-bg)', padding: '3px 10px', borderRadius: 99 }}>
                  {trip.status?.replace('_', ' ')}
                </span>
              </div>
              {displayOrders.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>No orders in this trip</div>
              ) : (
                <>
                  <div className="hide-mobile">
                    <table className="data-table">
                      <thead><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>{displayOrders.map(d => (
                        <tr key={d.id}>
                          <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{d.delivery_number}</span></td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{d.customers?.name || '—'}</td>
                          <td><DeliveryStatusBadge status={d.status} /></td>
                          <td>{renderActions(d)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className="show-mobile" style={{ padding: '10px 12px' }}>
                    {displayOrders.map(renderMobileCard)}
                  </div>
                </>
              )}
            </div>
          )
        })
      ) : (
        /* Default list view */
        <>
          <div className="hide-mobile card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Scheduled</th>
                  <th>Trip</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><Package size={36} /><h3>No orders</h3><p>Orders are created when you check "Create delivery" on a sale</p></div></td></tr>
                ) : filtered.map(renderOrderRow)}
              </tbody>
            </table>
          </div>
          <div className="show-mobile">
            {filtered.length === 0 ? (
              <div className="card"><div className="empty-state"><Package size={36} /><h3>No orders</h3></div></div>
            ) : filtered.map(renderMobileCard)}
          </div>
        </>
      )}

      <ProofOfDeliveryModal
        open={!!proofModal}
        delivery={proofModal}
        onClose={() => setProofModal(null)}
        onConfirm={handleProofConfirm}
        loading={proofLoading}
      />

      <CreateTripModal
        open={tripModal}
        deliveries={deliveries}
        onClose={() => setTripModal(false)}
        onCreate={handleCreateTrip}
        loading={tripLoading}
      />
    </div>
  )
}

export default OrderTracking
