import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, MapPin, Info } from 'lucide-react'
import { productService } from '../../services/productService'
import { supplierService } from '../../services/supplierService'
import { locationService } from '../../services/locationService'
import { useCategories } from '../../hooks/useProducts'
import { useLocations } from '../../hooks/useDeliveries'
import Button from '../../components/shared/Button'
import { PRODUCT_UNITS } from '../../utils/constants'

const AddProduct = () => {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const { locations, defaultLocation, loading: locLoading } = useLocations()
  const [suppliers, setSuppliers] = useState([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [form, setForm] = useState({
    product_code: '', product_name: '', category_id: '',
    supplier_id: '', quantity: 0, reorder_level: 10,
    buying_price: '', selling_price: '', unit: 'pcs',
    status: 'active', location_id: '',
  })

  // Auto-select location
  useEffect(() => {
    if (locLoading) return
    if (locations.length === 1) {
      setForm(f => ({ ...f, location_id: String(locations[0].id) }))
    } else if (defaultLocation) {
      setForm(f => ({ ...f, location_id: String(defaultLocation.id) }))
    }
  }, [locations, defaultLocation, locLoading])

  useEffect(() => {
    supplierService.getAll({ status: 'active' }).then(setSuppliers).catch(console.error)
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        category_id:   form.category_id   || null,
        supplier_id:   form.supplier_id    || null,
        quantity:      parseInt(form.quantity)      || 0,
        reorder_level: parseInt(form.reorder_level) || 10,
        buying_price:  parseFloat(form.buying_price),
        selling_price: parseFloat(form.selling_price),
      }
      const product = await productService.create(payload)
      if (form.location_id && payload.quantity > 0) {
        await locationService.setStock(product.id, parseInt(form.location_id), payload.quantity)
      }
      navigate('/inventory')
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const margin = form.buying_price && form.selling_price
    ? (((form.selling_price - form.buying_price) / form.buying_price) * 100).toFixed(1)
    : null

  const onlyOne      = !locLoading && locations.length === 1
  const selectedLoc  = locations.find(l => String(l.id) === String(form.location_id))

  return (
    <div className="page-wrapper" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => navigate('/inventory')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 className="page-title">Add Product</h1>
          <p className="page-subtitle">Add a new product to your inventory</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Product details */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Product Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="form-group">
              <label>Product Name *</label>
              <input className="input-base" value={form.product_name} onChange={set('product_name')} placeholder="e.g. PVC Conduit 25mm" required />
            </div>
            <div className="form-group">
              <label>Product Code *</label>
              <input className="input-base" value={form.product_code} onChange={set('product_code')} placeholder="e.g. PVC-25MM-001" required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="input-base" value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Supplier</label>
              <select className="input-base" value={form.supplier_id} onChange={set('supplier_id')}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select className="input-base" value={form.unit} onChange={set('unit')}>
                {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="input-base" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location assignment */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Stock Location
          </h2>
          {locLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading locations…</p>
          ) : locations.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
              <Info size={15} color="#d97706" />
              <span style={{ fontSize: 13, color: '#92400e' }}>
                No locations set up yet.{' '}
                <button type="button" onClick={() => navigate('/locations')}
                  style={{ color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
                  Add a location →
                </button>
              </span>
            </div>
          ) : onlyOne ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <MapPin size={15} color="#16a34a" />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#15803d' }}>{locations[0].name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Only one location — stock assigned here automatically.
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
                <Info size={13} />
                You have {locations.length} locations. Choose where this product's stock will be held.
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Assign to location *</label>
                <select className="input-base" value={form.location_id} onChange={set('location_id')} required>
                  <option value="">Select location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedLoc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, color: '#16a34a' }}>
                  <MapPin size={13} />
                  Stock will be recorded under: <strong>{selectedLoc.name}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock & pricing */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Stock & Pricing
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="form-group">
              <label>Initial Quantity</label>
              <input className="input-base" type="number" min="0" value={form.quantity} onChange={set('quantity')} />
            </div>
            <div className="form-group">
              <label>Reorder Level</label>
              <input className="input-base" type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Alert fires when stock hits this number</span>
            </div>
            <div className="form-group">
              <label>Buying Price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.buying_price} onChange={set('buying_price')} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label>Selling Price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price} onChange={set('selling_price')} placeholder="0.00" required />
            </div>
          </div>
          {margin !== null && (
            <div style={{ background: parseFloat(margin) >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              Profit Margin:{' '}
              <strong style={{ color: parseFloat(margin) >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>{margin}%</strong>
              {parseFloat(margin) >= 0 && parseFloat(margin) < 10 && (
                <span style={{ color: '#d97706', marginLeft: 10, fontSize: 12 }}>⚠ Low margin</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate('/inventory')} type="button">Cancel</Button>
          <Button variant="primary" loading={saving} icon={<Save />} type="submit">Save Product</Button>
        </div>
      </form>
    </div>
  )
}

export default AddProduct