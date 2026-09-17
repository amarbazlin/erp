import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { productService } from '../../services/productService'
import { useProducts, useCategories } from '../../hooks/useProducts'
import Button from '../../components/shared/Button'
import { formatCurrency } from '../../utils/formatters'

const AddProduct = () => {
  const navigate = useNavigate()
  const { categories, loading: catLoading } = useCategories()
  const { products: inventoryItems } = useProducts({ activeOnly: true })
  const [recipeItems, setRecipeItems] = useState([{ inventory_item_id: '', quantity_required: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    selling_price: '',
    is_active: true,
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleRecipeChange = (idx, field, val) => {
    setRecipeItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    )
  }

  const addRecipeRow = () => setRecipeItems((prev) => [...prev, { inventory_item_id: '', quantity_required: '' }])
  const removeRecipeRow = (idx) => setRecipeItems((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        selling_price: parseFloat(form.selling_price),
      }
      const product = await productService.create(payload)
      const validItems = recipeItems.filter(
        (i) => i.inventory_item_id && parseFloat(i.quantity_required) > 0
      )
      if (validItems.length > 0) {
        await productService.setRecipe(
          product.id,
          validItems.map((i) => ({
            inventory_item_id: i.inventory_item_id,
            quantity_required: parseFloat(i.quantity_required),
          }))
        )
      }
      navigate('/products')
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }


  return (
    <div className="page-wrapper" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => navigate('/products')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--card-border)', background: 'var(--card-bg)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <h1 className="page-title">Add Product</h1>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Product Details
          </h2>
          <div className="form-group">
            <label>Name *</label>
            <input className="input-base" value={form.name} onChange={set('name')} placeholder="e.g. Chocolate Kunafa Cup" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div className="form-group">
              <label>SKU</label>
              <input className="input-base" value={form.sku} onChange={set('sku')} placeholder="e.g. SWEET-001" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="input-base" value={form.category_id} onChange={set('category_id')} disabled={catLoading}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input-base" value={form.description} onChange={set('description')} placeholder="Optional product description…" rows={3} />
          </div>
        </div>

                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Selling Price
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div className="form-group">
              <label>Selling Price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price} onChange={set('selling_price')} placeholder="0.00" required />
            </div>
            <div className="form-group" style={{ marginTop: 28 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Recipe (raw materials)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Define which raw materials and quantities make one unit of this product. Cost is calculated automatically.
          </p>
          {recipeItems.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0 10px', alignItems: 'end', marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Raw Material</label>
                <select
                  className="input-base"
                  value={item.inventory_item_id}
                  onChange={(e) => handleRecipeChange(idx, 'inventory_item_id', e.target.value)}
                >
                  <option value="">Select material</option>
                  {inventoryItems.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Qty (g/ml/unit)</label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.quantity_required}
                  onChange={(e) => handleRecipeChange(idx, 'quantity_required', e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRecipeRow(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, padding: '6px 4px' }}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addRecipeRow}>
            Add Ingredient
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate('/products')} type="button">Cancel</Button>
          <Button variant="primary" loading={saving} icon={<Save />} type="submit">Save Product</Button>
        </div>
      </form>
    </div>
  )
}

export default AddProduct
