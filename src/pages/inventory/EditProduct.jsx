import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, MapPin, Info } from 'lucide-react'
import { productService } from '../../services/productService'
import { supplierService } from '../../services/supplierService'
import { locationService } from '../../services/locationService'
import { useCategories } from '../../hooks/useProducts'
import { useLocations } from '../../hooks/useDeliveries'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { PRODUCT_UNITS } from '../../utils/constants'
import { formatCurrencyShort } from '../../utils/formatters'

const EditProduct = () => {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { categories }                                      = useCategories()
  const { locations, defaultLocation, loading: locLoading } = useLocations()
  const [suppliers,     setSuppliers]     = useState([])
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [form,          setForm]          = useState(null)
  const [locationStock, setLocationStock] = useState([])  // stock breakdown per location

  // Load product + suppliers + location stock
  useEffect(() => {
    Promise.all([
      productService.getById(id),
      supplierService.getAll({ status: 'active' }),
    ]).then(([product, sups]) => {
      setForm({
        product_code:  product.product_code  || '',
        product_name:  product.product_name  || '',
        category_id:   product.category_id   || '',
        supplier_id:   product.supplier_id   || '',
        quantity:      product.quantity       || 0,
        reorder_level: product.reorder_level  || 10,
        buying_price:  product.buying_price   || '',
        selling_price: product.selling_price  || '',
        unit:          product.unit           || 'pcs',
        status:        product.status         || 'active',
        location_id:   '',
      })
      setSuppliers(sups)
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [id])

  // Load location-specific stock for this product
  useEffect(() => {
    if (locLoading || locations.length === 0) return
    Promise.all(
      locations.map(async loc => {
        const stocks = await locationService.getLocationStock(loc.id)
        const entry  = stocks.find(s => s.product_id === parseInt(id))
        return { location: loc, quantity: entry?.quantity ?? null }
      })
    ).then(setLocationStock).catch(console.error)
  }, [id, locations, locLoading])

  // Auto-select location if only one
  useEffect(() => {
    if (!form || locLoading) return
    if (locations.length === 1) {
      setForm(f => ({ ...f, location_id: String(locations[0].id) }))
    } else if (defaultLocation) {
      setForm(f => ({ ...f, location_id: String(defaultLocation.id) }))
    }
  }, [locations, defaultLocation, locLoading, form?.product_code])

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
      await productService.update(id, payload)

      // Update location stock if location selected
      if (form.location_id) {
        await locationService.setStock(
          parseInt(id),
          parseInt(form.location_id),
          payload.quantity
        )
      }
      navigate('/inventory')
    } catch (err) {
      setError(err.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={36} />
    </div>
  )
  if (!form) return null

  const margin = form.buying_price && form.selling_price
    ? (((form.selling_price - form.buying_price) / form.buying_price) * 100).toFixed(1)
    : null

  const onlyOne     = !locLoading && locations.length === 1
  const selectedLoc = locations.find(l => String(l.id) === String(form.location_id))

  return (
    <div className="page-wrapper" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => navigate('/inventory')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 className="page-title">Edit Product</h1>
          <p className="page-subtitle">{form.product_name}</p>
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
              <input className="input-base" value={form.product_name} onChange={set('product_name')} required />
            </div>
            <div className="form-group">
              <label>Product Code *</label>
              <input className="input-base" value={form.product_code} onChange={set('product_code')} required />
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

        {/* Location stock breakdown + assignment */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Stock by Location
          </h2>

          {/* Current location breakdown */}
          {locationStock.filter(ls => ls.quantity !== null && ls.quantity > 0).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                Current stock breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locationStock.map(ls => (
                  ls.quantity !== null && (
                    <div key={ls.location.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 14px', background: 'var(--content-bg)',
                      borderRadius: 8, fontSize: 13,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={13} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-secondary)' }}>{ls.location.name}</span>
                        {ls.location.is_default && (
                          <span style={{ fontSize: 10, background: '#fff7ed', color: '#f97316', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>Default</span>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 15,
                        color: ls.quantity === 0 ? 'var(--danger)' : ls.quantity <= 5 ? 'var(--warning)' : 'var(--text-primary)',
                      }}>
                        {ls.quantity} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{form.unit}</span>
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Update stock location */}
          {locations.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
              <Info size={14} color="#d97706" />
              <span style={{ fontSize: 13, color: '#92400e' }}>No locations configured.</span>
            </div>
          ) : onlyOne ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <MapPin size={14} color="#16a34a" />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#15803d' }}>{locations[0].name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Stock quantity update will apply to this location.</div>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Update stock at location</label>
              <select className="input-base" value={form.location_id} onChange={set('location_id')}>
                <option value="">Select location to update</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (Default)' : ''}</option>
                ))}
              </select>
              {selectedLoc && (
                <span style={{ fontSize: 12, color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={12} /> Quantity change will apply to: <strong>{selectedLoc.name}</strong>
                </span>
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
              <label>Total Stock Quantity</label>
              <input className="input-base" type="number" min="0" value={form.quantity} onChange={set('quantity')} />
            </div>
            <div className="form-group">
              <label>Reorder Level</label>
              <input className="input-base" type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} />
            </div>
            <div className="form-group">
              <label>Buying Price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.buying_price} onChange={set('buying_price')} required />
            </div>
            <div className="form-group">
              <label>Selling Price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price} onChange={set('selling_price')} required />
            </div>
          </div>
          {margin !== null && (
            <div style={{ background: parseFloat(margin) >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              Profit Margin:{' '}
              <strong style={{ color: parseFloat(margin) >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>{margin}%</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate('/inventory')} type="button">Cancel</Button>
          <Button variant="primary" loading={saving} icon={<Save />} type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}

export default EditProduct