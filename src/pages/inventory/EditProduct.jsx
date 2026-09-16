import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { productService } from '../../services/productService'
import { useCategories } from '../../hooks/useProducts'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { PRODUCT_UNITS } from '../../utils/constants'

const EditProduct = () => {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { categories } = useCategories()
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState(null)

  // Load product
  useEffect(() => {
    productService.getById(id)
      .then(product => {
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
        })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

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