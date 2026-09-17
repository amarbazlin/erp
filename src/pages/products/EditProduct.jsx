import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { productService, categoryService } from '../../services/productService'
import { useProducts } from '../../hooks/useProducts'
import Button from '../../components/shared/Button'
import { formatCurrency } from '../../utils/formatters'

const EditProduct = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [categories, setCategories] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [form, setForm] = useState(null)
  const [recipeItems, setRecipeItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [product, cats, items, recipe] = await Promise.all([
          productService.getById(id),
          categoryService.getAll(),
          productService.getAll({ activeOnly: true }),
          productService.getRecipe(id),
        ])
        setCategories(cats || [])
        setInventoryItems(items || [])
        setForm({
          name: product.name || '',
          sku: product.sku || '',
          category_id: product.category_id || '',
          description: product.description || '',
          selling_price: product.selling_price || '',
          is_active: product.is_active,
        })
        setRecipeItems(
          (recipe || []).map((r) => ({
            inventory_item_id: r.inventory_item_id,
            quantity_required: r.quantity_required,
          }))
        )
      } catch (err) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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
      await productService.update(id, {
        ...form,
        selling_price: parseFloat(form.selling_price),
      })
      const validItems = recipeItems.filter(
        (i) => i.inventory_item_id && parseFloat(i.quantity_required) > 0
      )
      await productService.setRecipe(
        id,
        validItems.map((i) => ({
          inventory_item_id: i.inventory_item_id,
          quantity_required: parseFloat(i.quantity_required),
        }))
      )
      navigate('/products')
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
            setSaving(false)
    }
  }

  if (loading) return null
  if (!form) return null

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
        <h1 className="page-title">Edit Product</h1>
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
            <input className="input-base" value={form.name} onChange={set('name')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div className="form-group">
              <label>SKU</label>
              <input className="input-base" value={form.sku} onChange={set('sku')} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="input-base" value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input-base" value={form.description} onChange={set('description')} rows={3} />
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Selling Price
          </h2>
          <div className="form-group">
            <label>Selling Price (LKR) *</label>
            <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price} onChange={set('selling_price')} required />
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Recipe (raw materials)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Edit which raw materials and quantities make one unit of this product.
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
          <Button variant="primary" loading={saving} icon={<Save />} type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}

export default EditProduct
