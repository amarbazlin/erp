import React, { useState, useMemo, useEffect } from 'react'
import { Plus, RefreshCw, Package } from 'lucide-react'
import { inventoryService, inventoryCategoryService } from '../../services/inventoryService'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import SearchBar from '../../components/shared/SearchBar'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'

const UNITS = ['g', 'ml', 'unit']

export const fmtQty = (q, unit) => {
  const n = parseFloat(q) || 0
  if (unit === 'g' && n >= 1000) return `${(n / 1000).toFixed(2)} kg`
  if (unit === 'ml' && n >= 1000) return `${(n / 1000).toFixed(2)} L`
  return `${n} ${unit}`
}

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

const restockStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px',
  borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff',
  color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

const Materials = () => {
  const { user } = useAuth()
  const [items,       setItems]       = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [restockItem, setRestockItem] = useState(null)
  const [restockQty,  setRestockQty]  = useState('')
  const [restockCost, setRestockCost] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    try {
      const [data, cats] = await Promise.all([
        inventoryService.getAll({ activeOnly: false }),
        inventoryCategoryService.getAll(),
      ])
      setItems(data || [])
      setCategories(cats || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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
  const lowStockCount = displayItems.filter(i =>
    (parseFloat(i.current_quantity) || 0) <= (parseFloat(i.low_stock_threshold) || 0)
  ).length

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await inventoryService.create({
        name: form.name,
        sku: form.sku || null,
        category_id: form.category_id || null,
        unit: form.unit,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        current_quantity: parseFloat(form.current_quantity) || 0,
        low_stock_threshold: parseFloat(form.low_stock_threshold) || 0,
        supplier_name: form.supplier_name || null,
        supplier_phone: form.supplier_phone || null,
      })
      if (parseFloat(form.current_quantity) > 0) {
        await inventoryService.addTransaction({
          inventoryItemId: created.id,
          type: 'purchase',
          quantity: parseFloat(form.current_quantity),
          costPerUnit: parseFloat(form.cost_per_unit) || null,
          notes: 'Initial stock',
          createdBy: user?.id,
        })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      alert('Failed to save material: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRestock = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await inventoryService.addTransaction({
        inventoryItemId: restockItem.id,
        type: 'purchase',
        quantity: parseFloat(restockQty),
        costPerUnit: restockCost ? parseFloat(restockCost) : null,
        notes: 'Restock',
        createdBy: user?.id,
      })
      setRestockItem(null)
      load()
    } catch (err) {
      alert('Restock failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader fullPage label="Loading raw materials…" />

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Raw Materials</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {displayItems.length} materials · {formatCurrency(totalValue)} stock value
            {lowStockCount > 0 && ` · ${lowStockCount} low`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => { setForm(EMPTY_FORM); setModalOpen(true) }}>Add Material</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Materials', value: displayItems.length, color: '#3b82f6' },
          { label: 'Stock Value',     value: formatCurrency(totalValue), color: '#f97316' },
          { label: 'Low / Out of Stock', value: lowStockCount, color: lowStockCount > 0 ? '#dc2626' : '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card filter-toolbar" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search materials…" width={240} />
        <select className="input-base" value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ width: 190 }}>
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
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Package size={28} style={{ marginBottom: 8 }} />
                    <p>No materials found</p>
                  </td>
                </tr>
              ) : displayItems.map(item => {
                const st = stockStatus(item)
                const value = (parseFloat(item.current_quantity) || 0) * ((parseFloat(item.cost_per_unit) || 0) / 1000)
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.sku || '—'}</td>
                    <td>{item.inventory_categories?.name || '—'}</td>
                    <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{fmtQty(item.current_quantity, item.unit)}</td>
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
                      <button style={restockStyle} onClick={() => { setRestockItem(item); setRestockQty(''); setRestockCost('') }}>
                        Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add material modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Raw Material"
      >
        <form onSubmit={handleCreate}>
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
              <select className="input-base" value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Unit *</label>
              <select className="input-base" value={form.unit} onChange={set('unit')}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cost per kg / L / unit (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.cost_per_unit} onChange={set('cost_per_unit')} required placeholder="2400" />
            </div>
            <div className="form-group">
              <label>Current quantity ({form.unit}) *</label>
              <input className="input-base" type="number" step="0.001" min="0" value={form.current_quantity} onChange={set('current_quantity')} required placeholder="10000" />
            </div>
            <div className="form-group">
              <label>Low stock threshold ({form.unit})</label>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={saving}>Save Material</Button>
          </div>
        </form>
      </Modal>

      {/* Restock modal */}
      <Modal
        open={!!restockItem}
        onClose={() => setRestockItem(null)}
        title={restockItem ? `Restock — ${restockItem.name}` : 'Restock'}
      >
        {restockItem && (
          <form onSubmit={handleRestock}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
              Current stock: <strong style={{ color: 'var(--text-primary)' }}>{fmtQty(restockItem.current_quantity, restockItem.unit)}</strong> ·
              Cost per {restockItem.unit === 'g' ? 'kg' : restockItem.unit === 'ml' ? 'L' : 'unit'}: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(restockItem.cost_per_unit)}</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group">
                <label>Quantity added ({restockItem.unit}) *</label>
                <input className="input-base" type="number" step="0.001" min="0.001" value={restockQty} onChange={e => setRestockQty(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>New cost per kg / L / unit</label>
                <input className="input-base" type="number" step="0.01" min="0" value={restockCost} onChange={e => setRestockCost(e.target.value)} placeholder={String(restockItem.cost_per_unit)} />
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Leave the new cost empty to keep the current one. Stock is added via a purchase transaction.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" type="button" onClick={() => setRestockItem(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={saving}>Add Stock</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default Materials