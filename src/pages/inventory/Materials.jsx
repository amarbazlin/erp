import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Package, Pencil, Power, AlertTriangle, ArrowDownToLine, SlidersHorizontal } from 'lucide-react'
import { inventoryService, inventoryCategoryService } from '../../services/inventoryService'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'
import { MATERIAL_UNITS } from '../../utils/constants'

const UNITS = MATERIAL_UNITS

// Quantity display — grams/ml shown with a friendly KG/L equivalent.
export const fmtQty = (q, unit) => {
  const n = parseFloat(q) || 0
  if (unit === 'g' && n >= 1000) return `${(n / 1000).toFixed(2)} kg`
  if (unit === 'ml' && n >= 1000) return `${(n / 1000).toFixed(2)} L`
  return `${n} ${unit || 'g'}`
}

// Low-stock rule — same as the DB (current_quantity <= low_stock_threshold).
export const stockStatus = (item) => {
  const q = parseFloat(item.current_quantity) || 0
  const t = parseFloat(item.low_stock_threshold) || 0
  if (q <= 0) return { label: 'Out of stock', color: '#dc2626', bg: '#fef2f2' }
  if (q <= t) return { label: 'Low stock', color: '#d97706', bg: '#fffbeb' }
  return { label: 'In stock', color: '#16a34a', bg: '#f0fdf4' }
}

const EMPTY_FORM = {
  name: '', sku: '', category_id: '', unit: 'g',
  cost_per_unit: '', current_quantity: '', low_stock_threshold: '',
  supplier_name: '', supplier_phone: '',
}

const EMPTY_MOVEMENT = { quantity: '', cost_per_unit: '', notes: '' }

const MOVEMENT_META = {
  purchase:   { title: 'Add Stock (Purchase)', label: 'Quantity added',   hint: 'Recorded as a purchase and added to the current stock.' },
  adjustment: { title: 'Stock Adjustment',     label: 'Counted quantity', hint: 'Sets the stock to the exact counted quantity (recorded as an adjustment).' },
  waste:      { title: 'Record Waste',         label: 'Quantity removed', hint: 'Removes stock that was lost, spoiled or used internally.' },
}

const iconBtn = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--card-border)',
  background: 'var(--card-bg)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

const restockStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px',
  borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff',
  color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

const Materials = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [message, setMessage] = useState(null)

  const [editor, setEditor] = useState(null)          // { mode, item }
  const [form, setForm] = useState(EMPTY_FORM)
  const [newCategory, setNewCategory] = useState('')

  const [movement, setMovement] = useState(null)       // { item, type }
  const [moveForm, setMoveForm] = useState(EMPTY_MOVEMENT)

  const [toggleTarget, setToggleTarget] = useState(null)

  const notify = useCallback((type, text) => setMessage({ type, text }), [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, cats] = await Promise.all([
        inventoryService.getAll({ activeOnly: false }),
        inventoryCategoryService.getAll(),
      ])
      setItems(data || [])
      setCategories(cats || [])
    } catch (err) {
      notify('error', 'Could not load raw materials: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openCreate = () => { setForm(EMPTY_FORM); setNewCategory(''); setEditor({ mode: 'create' }) }

  const openEdit = (item) => {
    setForm({
      name: item.name || '', sku: item.sku || '', category_id: item.category_id || '',
      unit: item.unit || 'g',
      cost_per_unit: item.cost_per_unit ?? '',
      low_stock_threshold: item.low_stock_threshold ?? '',
      supplier_name: item.supplier_name || '', supplier_phone: item.supplier_phone || '',
    })
    setNewCategory('')
    setEditor({ mode: 'edit', item })
  }

  const openMovement = (item, type) => {
    setMovement({ item, type })
    setMoveForm({
      quantity: type === 'adjustment' ? String(parseFloat(item.current_quantity) || 0) : '',
      cost_per_unit: '',
      notes: '',
    })
  }

  const resolveCategoryId = async () => {
    const name = newCategory.trim()
    if (!name) return form.category_id || null
    const created = await inventoryCategoryService.create({ name })
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created.id
  }

  const handleSaveMaterial = async (e) => {
    e.preventDefault()
    const cost = parseFloat(form.cost_per_unit)
    const threshold = parseFloat(form.low_stock_threshold) || 0
    if (!form.name.trim()) return notify('error', 'Material name is required.')
    if (Number.isNaN(cost) || cost < 0) return notify('error', 'Cost per KG / L / unit must be 0 or more.')
    if (threshold < 0) return notify('error', 'Low-stock threshold cannot be negative.')

    setSaving(true)
    try {
      const category_id = await resolveCategoryId()
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category_id,
        unit: form.unit,
        cost_per_unit: cost,
        low_stock_threshold: threshold,
        supplier_name: form.supplier_name.trim() || null,
        supplier_phone: form.supplier_phone.trim() || null,
      }

      if (editor.mode === 'create') {
        const opening = parseFloat(form.current_quantity) || 0
        if (opening < 0) throw new Error('Opening stock cannot be negative.')
        const created = await inventoryService.create({ ...payload, current_quantity: 0 })
        if (opening > 0) {
          await inventoryService.addTransaction({
            inventoryItemId: created.id, type: 'purchase', quantity: opening,
            costPerUnit: cost, notes: 'Opening stock', createdBy: user?.id,
          })
        }
        notify('success', `${created.name} added to raw materials.`)
      } else {
        await inventoryService.update(editor.item.id, payload)
        notify('success', `${payload.name} updated.`)
      }
      setEditor(null)
      await load()
    } catch (err) {
      notify('error', err.message || 'Could not save the material.')
    } finally {
      setSaving(false)
    }
  }

  const handleMovement = async (e) => {
    e.preventDefault()
    const { item, type } = movement
    const qty = parseFloat(moveForm.quantity)
    const current = parseFloat(item.current_quantity) || 0

    if (Number.isNaN(qty) || qty < 0) return notify('error', 'Enter a valid quantity.')
    if (type !== 'adjustment' && qty <= 0) return notify('error', 'Quantity must be greater than 0.')
    if (type === 'waste' && qty > current) {
      return notify('error', `Only ${fmtQty(current, item.unit)} in stock — cannot remove ${fmtQty(qty, item.unit)}.`)
    }
    const newCost = moveForm.cost_per_unit === '' ? null : parseFloat(moveForm.cost_per_unit)
    if (newCost !== null && (Number.isNaN(newCost) || newCost < 0)) {
      return notify('error', 'New cost per KG / L / unit must be 0 or more.')
    }

    setSaving(true)
    try {
      if (type === 'purchase' && newCost !== null && newCost !== parseFloat(item.cost_per_unit)) {
        await inventoryService.update(item.id, { cost_per_unit: newCost })
      }
      await inventoryService.addTransaction({
        inventoryItemId: item.id,
        type,
        quantity: qty,
        costPerUnit: newCost ?? (parseFloat(item.cost_per_unit) || null),
        notes: moveForm.notes.trim() || MOVEMENT_META[type].title,
        createdBy: user?.id,
      })
      notify('success', `${MOVEMENT_META[type].title} recorded for ${item.name}.`)
      setMovement(null)
      await load()
    } catch (err) {
      notify('error', err.message || 'Stock update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    setSaving(true)
    try {
      const next = !toggleTarget.is_active
      await inventoryService.setActive(toggleTarget.id, next)
      notify('success', `${toggleTarget.name} ${next ? 'reactivated' : 'deactivated'}.`)
      setToggleTarget(null)
      await load()
    } catch (err) {
      notify('error', err.message || 'Could not update the material.')
    } finally {
      setSaving(false)
    }
  }
  const displayItems = useMemo(() => {
    let list = items
    if (selectedCat) list = list.filter(i => String(i.category_id) === String(selectedCat))
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(s) || (i.sku || '').toLowerCase().includes(s))
    }
    return list
  }, [items, selectedCat, search])

  const totalValue = displayItems.reduce((s, i) =>
    s + (parseFloat(i.current_quantity) || 0) * ((parseFloat(i.cost_per_unit) || 0) / 1000), 0)
  const lowStockItems = displayItems.filter(i =>
    (parseFloat(i.current_quantity) || 0) <= (parseFloat(i.low_stock_threshold) || 0))
  const activeCount = displayItems.filter(i => i.is_active).length

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Raw Material Inventory</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {displayItems.length} material{displayItems.length !== 1 ? 's' : ''} · {activeCount} active · stock stored in grams
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load}>Refresh</Button>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openCreate}>Add Material</Button>
        </div>
      </div>

      {/* Success / error message */}
      {message && (
        <div style={{
          padding: '9px 14px', marginBottom: 14, borderRadius: 9, fontSize: 12.5, fontWeight: 500,
          background: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
        }}>{message.text}</div>
      )}

      {/* Low-stock warning */}
      {lowStockItems.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'var(--warning-bg)', border: '1px solid #fde68a' }}>
          <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--warning-text)' }}>
            <strong>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} at or below the low-stock threshold:</strong>{' '}
            {lowStockItems.slice(0, 5).map(i => i.name).join(', ')}{lowStockItems.length > 5 ? ` +${lowStockItems.length - 5} more` : ''}.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Materials', value: displayItems.length, color: '#3b82f6' },
          { label: 'Stock Value', value: formatCurrency(totalValue), color: '#f97316' },
          { label: 'Low / Out of Stock', value: lowStockItems.length, color: lowStockItems.length > 0 ? '#dc2626' : '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search materials or SKUs…" width={260} />
        <select className="input-base" value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ width: 180 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
{/* Table */}
      <div className="card">
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Cost / kg</th>
                <th>Value</th>
                <th>Status</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24 }}><Loader /></td></tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Package size={28} style={{ marginBottom: 8 }} />
                    <p>No materials found</p>
                  </td>
                </tr>
              ) : displayItems.map(item => {
                const st = stockStatus(item)
                const qty = parseFloat(item.current_quantity) || 0
                const value = qty * ((parseFloat(item.cost_per_unit) || 0) / 1000)
                return (
                  <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                      {!item.is_active && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inactive</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.sku || '—'}</td>
                    <td>{item.inventory_categories?.name || '—'}</td>
                    <td>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{qty} {item.unit}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>approx {fmtQty(qty, item.unit)}</div>
                    </td>
                    <td>{formatCurrency(item.cost_per_unit)}</td>
                    <td>{formatCurrency(value)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 99, background: st.bg, color: st.color, fontSize: 11.5, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {item.supplier_name || '—'}
                      {item.supplier_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.supplier_phone}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button style={restockStyle} onClick={() => openMovement(item, 'purchase')} title="Add stock">
                          <ArrowDownToLine size={12} /> Restock
                        </button>
                        <button style={iconBtn} onClick={() => openMovement(item, 'adjustment')} title="Adjust stock">
                          <SlidersHorizontal size={13} color="var(--text-secondary)" />
                        </button>
                        <button style={iconBtn} onClick={() => openEdit(item)} title="Edit material">
                          <Pencil size={13} color="var(--text-secondary)" />
                        </button>
                        <button style={iconBtn} onClick={() => setToggleTarget(item)} title={item.is_active ? 'Deactivate' : 'Reactivate'}>
                          <Power size={13} color={item.is_active ? 'var(--danger)' : 'var(--success)'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add / edit material modal */}
      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor?.mode === 'edit' ? `Edit — ${editor.item.name}` : 'Add Raw Material'}
        width={560}
      >
        {editor && (
          <form onSubmit={handleSaveMaterial}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group">
                <label>Name *</label>
                <input className="input-base" value={form.name} onChange={set('name')} required placeholder="Chocolate" />
              </div>
              <div className="form-group">
                <label>SKU</label>
                <input className="input-base" value={form.sku} onChange={set('sku')} placeholder="RM-CHOC-001" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="input-base" value={form.category_id} onChange={set('category_id')} disabled={!!newCategory.trim()}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>New category (optional)</label>
                <input className="input-base" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Packaging" />
              </div>
              <div className="form-group">
                <label>Unit *</label>
                <select className="input-base" value={form.unit} onChange={set('unit')}>
                  {UNITS.map(u => <option key={u} value={u}>{u === 'g' ? 'grams (g)' : u === 'ml' ? 'millilitres (ml)' : 'units'}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cost per KG / L / unit (Rs.) *</label>
                <input className="input-base" type="number" step="0.01" min="0" value={form.cost_per_unit} onChange={set('cost_per_unit')} required placeholder="2400" />
              </div>
              {editor.mode === 'create' && (
                <div className="form-group">
                  <label>Opening stock ({form.unit})</label>
                  <input className="input-base" type="number" step="0.001" min="0" value={form.current_quantity} onChange={set('current_quantity')} placeholder="0" />
                </div>
              )}
              <div className="form-group">
                <label>Low-stock threshold ({form.unit})</label>
                <input className="input-base" type="number" step="0.001" min="0" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} placeholder="2000" />
              </div>
              <div className="form-group">
                <label>Supplier name</label>
                <input className="input-base" value={form.supplier_name} onChange={set('supplier_name')} />
              </div>
              <div className="form-group">
                <label>Supplier phone</label>
                <input className="input-base" value={form.supplier_phone} onChange={set('supplier_phone')} />
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Stock is stored in {form.unit === 'unit' ? 'units' : form.unit}. Enter the purchase price per KG / L / unit —
              the per-gram cost is derived automatically when recipes are costed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" type="button" onClick={() => setEditor(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={saving}>
                {editor.mode === 'edit' ? 'Save Changes' : 'Save Material'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
{/* Stock movement modal (purchase / adjustment / waste) */}
      <Modal
        open={!!movement}
        onClose={() => setMovement(null)}
        title={movement ? `${MOVEMENT_META[movement.type].title} — ${movement.item.name}` : ''}
      >
        {movement && (
          <form onSubmit={handleMovement}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
              Current stock: <strong style={{ color: 'var(--text-primary)' }}>{fmtQty(movement.item.current_quantity, movement.item.unit)}</strong>
              {' · '}Cost per {movement.item.unit === 'unit' ? 'unit' : 'kg'}: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(movement.item.cost_per_unit)}</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group">
                <label>{MOVEMENT_META[movement.type].label} ({movement.item.unit}) *</label>
                <input
                  className="input-base" type="number" step="0.001" min="0" required autoFocus
                  value={moveForm.quantity}
                  onChange={e => setMoveForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              {movement.type === 'purchase' && (
                <div className="form-group">
                  <label>New cost per KG / L / unit</label>
                  <input
                    className="input-base" type="number" step="0.01" min="0"
                    value={moveForm.cost_per_unit}
                    onChange={e => setMoveForm(f => ({ ...f, cost_per_unit: e.target.value }))}
                    placeholder={String(movement.item.cost_per_unit)}
                  />
                </div>
              )}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Notes</label>
                <input
                  className="input-base"
                  value={moveForm.notes}
                  onChange={e => setMoveForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional reference"
                />
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {MOVEMENT_META[movement.type].hint}
              {movement.type === 'purchase' && ' Leave the new cost empty to keep the current one.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" type="button" onClick={() => setMovement(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={saving}>Save</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Activate / deactivate confirm */}
      <Modal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Deactivate Material' : 'Reactivate Material'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button
              variant={toggleTarget?.is_active ? 'danger' : 'primary'}
              loading={saving}
              onClick={handleToggleActive}
            >
              {toggleTarget?.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {toggleTarget?.is_active
            ? <>Deactivate <strong>{toggleTarget?.name}</strong>? It stays in the database and existing recipes keep working, but it will be hidden from the material list by default.</>
            : <>Reactivate <strong>{toggleTarget?.name}</strong>?</>}
        </p>
      </Modal>
    </div>
  )
}

export default Materials