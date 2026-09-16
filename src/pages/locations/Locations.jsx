import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, MapPin, Package, ArrowRight,
  Warehouse, Store, RefreshCw, Edit2,
  TrendingDown, AlertTriangle, CheckCircle
} from 'lucide-react'
import { locationService } from '../../services/locationService'
import { useLocations } from '../../hooks/useDeliveries'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import StockStatusBadge from '../../components/inventory/StockStatusBadge'
import { formatCurrencyShort, formatCurrency } from '../../utils/formatters'

// ── Location type icon ────────────────────────────────────────────────────────
const LocationIcon = ({ name, size = 18 }) => {
  const n = (name || '').toLowerCase()
  if (n.includes('warehouse') || n.includes('store'))  return <Warehouse size={size} />
  if (n.includes('shop') || n.includes('showroom'))    return <Store size={size} />
  return <MapPin size={size} />
}

// ── Location form ─────────────────────────────────────────────────────────────
const LocationForm = ({ initial = {}, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', is_default: false, status: 'active', ...initial,
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group">
          <label>Location Name *</label>
          <input className="input-base" value={form.name} onChange={set('name')} placeholder="e.g. Main Warehouse, Matara Store" required />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input className="input-base" value={form.phone} onChange={set('phone')} placeholder="0412-XXXXXX" />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Address</label>
          <input className="input-base" value={form.address} onChange={set('address')} placeholder="Street, City" />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', margin: '4px 0 18px' }}>
        <input type="checkbox" checked={form.is_default} onChange={set('is_default')} />
        Set as default location (used when no location is specified)
      </label>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={saving} onClick={() => onSave(form)}>Save Location</Button>
      </div>
    </div>
  )
}

// ── Stock table for a location ────────────────────────────────────────────────
const LocationStockTable = ({ locationId, locationName }) => {
  const [stock,   setStock]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await locationService.getLocationStock(locationId)
      setStock(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [locationId])

  useEffect(() => { load() }, [load])

  const totalValue    = stock.reduce((s, ls) => s + ls.quantity * (ls.products?.buying_price || 0), 0)
  const outOfStock    = stock.filter(ls => ls.quantity === 0).length
  const lowStock      = stock.filter(ls => ls.quantity > 0 && ls.quantity <= (ls.products?.reorder_level || 0)).length
  const healthyStock  = stock.length - outOfStock - lowStock

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><Loader /></div>

  if (stock.length === 0) return (
    <div className="empty-state" style={{ padding: 40 }}>
      <Package size={32} strokeWidth={1.5} />
      <h3>No stock assigned</h3>
      <p>Add products and assign them to <strong>{locationName}</strong> to see stock here.</p>
    </div>
  )

  return (
    <div>
      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total SKUs',   value: stock.length,   color: '#3b82f6' },
          { label: 'Stock Value',  value: formatCurrencyShort(totalValue), color: '#f97316' },
          { label: 'Healthy',      value: healthyStock,   color: '#22c55e' },
          { label: 'Low Stock',    value: lowStock,        color: '#f59e0b' },
          { label: 'Out of Stock', value: outOfStock,      color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
            <span style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
            <strong style={{ color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Stock table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th style={{ textAlign: 'center' }}>Qty Here</th>
              <th style={{ textAlign: 'center' }}>Reorder At</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {[...stock]
              .sort((a, b) => {
                // Sort: out of stock first, then low, then healthy
                const score = x => x.quantity === 0 ? 0 : x.quantity <= (x.products?.reorder_level || 0) ? 1 : 2
                return score(a) - score(b)
              })
              .map(ls => {
                const p      = ls.products
                const value  = ls.quantity * (p?.buying_price || 0)
                return (
                  <tr key={ls.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p?.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p?.product_code}</div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {p?.categories?.name || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 17,
                        color: ls.quantity === 0 ? '#dc2626'
                          : ls.quantity <= (p?.reorder_level || 0) ? '#d97706'
                          : 'var(--text-primary)',
                      }}>
                        {ls.quantity}
                      </span>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{p?.unit}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {p?.reorder_level ?? '—'}
                    </td>
                    <td>
                      <StockStatusBadge quantity={ls.quantity} reorderLevel={p?.reorder_level || 10} />
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13 }}>
                      {formatCurrencyShort(value)}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const Locations = () => {
  const { locations, loading, refetch } = useLocations()
  const [selectedLocId, setSelectedLocId]   = useState(null)
  const [addModal,      setAddModal]         = useState(false)
  const [editTarget,    setEditTarget]       = useState(null)
  const [saving,        setSaving]           = useState(false)
  const [transfers,     setTransfers]        = useState([])

  // Select first location by default when loaded
  useEffect(() => {
    if (!loading && locations.length > 0 && !selectedLocId) {
      const def = locations.find(l => l.is_default) || locations[0]
      setSelectedLocId(def.id)
    }
  }, [locations, loading, selectedLocId])

  // Load recent transfers
  useEffect(() => {
    locationService.getTransfers().then(setTransfers).catch(console.error)
  }, [])

  const handleSave = async form => {
    setSaving(true)
    try {
      if (editTarget) {
        await locationService.update(editTarget.id, form)
        setEditTarget(null)
      } else {
        await locationService.create(form)
        setAddModal(false)
      }
      refetch()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const selectedLocation = locations.find(l => l.id === selectedLocId)

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">
            {locations.length} location{locations.length !== 1 ? 's' : ''} — click a branch to view its stock
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon={<RefreshCw />} size="sm" onClick={refetch}>Refresh</Button>
          <Button icon={<Plus />} onClick={() => setAddModal(true)}>Add Location</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader size={36} /></div>
      ) : locations.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <MapPin size={40} strokeWidth={1.5} />
            <h3>No locations yet</h3>
            <p>Add your first location — a warehouse, store, or showroom.</p>
            <div style={{ marginTop: 16 }}>
              <Button icon={<Plus />} onClick={() => setAddModal(true)}>Add First Location</Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>

          {/* ── Left: location selector panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locations.map(loc => {
              const isSelected = loc.id === selectedLocId
              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedLocId(loc.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `1.5px solid ${isSelected ? '#f97316' : 'var(--card-border)'}`,
                    background: isSelected ? '#fff7ed' : 'var(--card-bg)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 4px 12px rgba(249,115,22,0.12)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isSelected ? 'rgba(249,115,22,0.12)' : 'var(--content-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <LocationIcon name={loc.name} size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Outfit, sans-serif', fontSize: 13.5, fontWeight: 700,
                        color: isSelected ? '#ea6c00' : 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {loc.name}
                      </div>
                      {loc.address && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {loc.address}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flex: 'column', gap: 4, flexShrink: 0 }}>
                      {loc.is_default && (
                        <span style={{ fontSize: 9.5, background: '#fff7ed', color: '#f97316', padding: '1px 6px', borderRadius: 99, fontWeight: 700, fontFamily: 'Outfit, sans-serif', display: 'block', textAlign: 'center' }}>
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit button */}
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setEditTarget(loc) }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11.5, color: 'var(--text-muted)',
                        padding: '3px 6px', borderRadius: 5,
                      }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Recent transfers mini list */}
            {transfers.length > 0 && (
              <div className="card" style={{ marginTop: 8, padding: '14px 16px', overflow: 'hidden' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Recent Transfers
                </div>
                {transfers.slice(0, 4).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {t.from_location?.name?.split(' ')[0]} → {t.to_location?.name?.split(' ')[0]}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 99, marginLeft: 6, flexShrink: 0,
                      background: t.status === 'completed' ? 'var(--success-bg)' : '#fffbeb',
                      color:      t.status === 'completed' ? 'var(--success)' : '#d97706',
                      fontWeight: 600,
                    }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: stock for selected location ── */}
          <div>
            {selectedLocation ? (
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* Location header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'linear-gradient(135deg, #0d1117, #1a1f2e)',
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LocationIcon name={selectedLocation.name} size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                      {selectedLocation.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 3 }}>
                      {[selectedLocation.address, selectedLocation.phone].filter(Boolean).join(' · ') || 'No address on file'}
                    </div>
                  </div>
                  {selectedLocation.is_default && (
                    <span style={{ fontSize: 11, background: 'rgba(249,115,22,0.15)', color: '#f97316', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                      Default Location
                    </span>
                  )}
                </div>

                {/* Stock table for this location */}
                <LocationStockTable
                  locationId={selectedLocation.id}
                  locationName={selectedLocation.name}
                />
              </div>
            ) : (
              <div className="card">
                <div className="empty-state" style={{ padding: 60 }}>
                  <MapPin size={36} strokeWidth={1.5} />
                  <h3>Select a location</h3>
                  <p>Click a location on the left to view its stock.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Location" width={520}>
        <LocationForm onSave={handleSave} onCancel={() => setAddModal(false)} saving={saving} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name}`} width={520}>
        <LocationForm initial={editTarget || {}} onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
      </Modal>
    </div>
  )
}

export default Locations