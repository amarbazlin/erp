import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, ImagePlus, X } from 'lucide-react'
import { productService, categoryService } from '../../services/productService'
import { inventoryService } from '../../services/inventoryService'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatCurrency } from '../../utils/formatters'
import { calcRecipeCost } from '../../utils/calculations'
import { IMAGE_ACCEPT_ATTR } from '../../utils/imageUtils'

const emptyRow = () => ({ inventory_item_id: '', quantity_required: '' })

const EditProduct = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const backTo = location.state?.from === 'inventory' ? '/inventory' : '/products'

  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [form, setForm] = useState(null)
  const [recipeItems, setRecipeItems] = useState([])
  const [current, setCurrent] = useState(null)   // DB cost + available stock
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageWarning, setImageWarning] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [product, cats, mats, recipe] = await Promise.all([
          productService.getById(id),
          categoryService.getAll(),
          inventoryService.getAll({ activeOnly: true }),
          productService.getRecipe(id),
        ])
        setCategories(cats || [])
        setMaterials(mats || [])
        setForm({
          name: product.name || '',
          sku: product.sku || '',
          category_id: product.category_id || '',
          description: product.description || '',
          image_url: product.image_url || '',
          selling_price: product.selling_price ?? '',
          is_active: product.is_active,
        })
        setRecipeItems(
          (recipe || []).length
            ? recipe.map(r => ({ inventory_item_id: r.inventory_item_id, quantity_required: r.quantity_required }))
            : [emptyRow()]
        )

        // Current cost / availability straight from the DB views
        const perf = await productService.getPerformance()
        const row = (perf || []).find(p => p.id === id)
        if (row) setCurrent({ cost: row.recipe_cost, profit: row.estimated_profit, available: row.available_stock })
      } catch (err) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const materialsById = useMemo(
    () => Object.fromEntries(materials.map(m => [m.id, m])),
    [materials]
  )
  const previewCost = useMemo(
    () => calcRecipeCost(recipeItems, materialsById),
    [recipeItems, materialsById]
  )
  const previewPrice = parseFloat(form?.selling_price) || 0
  const previewProfit = previewPrice - previewCost
  const previewMargin = previewPrice > 0 ? (previewProfit / previewPrice) * 100 : 0
  const handleRecipeChange = (idx, field, val) =>
    setRecipeItems(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)))
  const addRecipeRow = () => setRecipeItems(prev => [...prev, emptyRow()])
  const removeRecipeRow = (idx) => setRecipeItems(prev => prev.filter((_, i) => i !== idx))

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setError('')
    setImageWarning('')
    try {
      const { url, stored, warning } = await productService.uploadProductImage(file)
      setForm(f => ({ ...f, image_url: url }))
      if (!stored && warning) setImageWarning(warning)
    } catch (err) {
      setError('Image upload failed: ' + err.message)
    } finally {
      setImageUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const validateRecipe = () => {
    const chosen = recipeItems.filter(i => i.inventory_item_id)
    const ids = chosen.map(i => i.inventory_item_id)
    if (new Set(ids).size !== ids.length) {
      return 'Each raw material can only be used once in the recipe.'
    }
    if (chosen.some(i => !(parseFloat(i.quantity_required) > 0))) {
      return 'Every selected raw material needs a quantity greater than 0.'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const price = parseFloat(form.selling_price)
    if (!form.name.trim()) return setError('Product name is required.')
    if (Number.isNaN(price) || price < 0) return setError('Selling price must be 0 or more.')
    const recipeError = validateRecipe()
    if (recipeError) return setError(recipeError)

    setSaving(true)
    try {
      await productService.update(id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category_id: form.category_id || null,
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        selling_price: price,
        is_active: form.is_active,
      })
      const validItems = recipeItems.filter(
        i => i.inventory_item_id && parseFloat(i.quantity_required) > 0
      )
      // setRecipe replaces the recipe and the DB trigger recalculates the cost.
      await productService.setRecipe(id, validItems.map(i => ({
        inventory_item_id: i.inventory_item_id,
        quantity_required: parseFloat(i.quantity_required),
      })))
      navigate(backTo)
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader size={30} /></div>
  if (!form) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Product not found</div>

return (
    <div className="page-wrapper" style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button
          onClick={() => navigate(backTo)}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 className="page-title">Edit Product</h1>
          <p className="page-subtitle">Update the price, image or recipe — cost and availability are recalculated automatically.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{error}</div>
      )}
      {imageWarning && (
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16, color: '#92400e', fontSize: 12.5 }}>{imageWarning}</div>
      )}

      {/* Current values from the DB views */}
      {current && (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {[
            { label: 'Current Recipe Cost', value: formatCurrency(current.cost), color: '#3b82f6' },
            { label: 'Current Est. Profit', value: formatCurrency(current.profit), color: current.profit >= 0 ? 'var(--success)' : 'var(--danger)' },
            { label: 'Available Stock',     value: current.available, color: current.available <= 0 ? 'var(--danger)' : 'var(--text-primary)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, color: s.color, marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Product details */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Product Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div className="form-group">
              <label>Product name *</label>
              <input className="input-base" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label>SKU</label>
              <input className="input-base" value={form.sku} onChange={set('sku')} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Category</label>
              <select className="input-base" value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea className="input-base" rows={3} value={form.description} onChange={set('description')} />
            </div>
          </div>
        </div>

{/* Product image */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Product Image
          </h2>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 116, height: 116, borderRadius: 12, border: '1.5px dashed var(--card-border)', background: 'var(--content-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {form.image_url
                ? <img src={form.image_url} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <ImagePlus size={26} color="var(--text-muted)" />}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT_ATTR} onChange={handleImagePick} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Button variant="secondary" size="sm" icon={<ImagePlus size={13} />} loading={imageUploading} onClick={() => fileRef.current?.click()}>
                  {form.image_url ? 'Replace image' : 'Upload image'}
                </Button>
                {form.image_url && (
                  <Button variant="danger" size="sm" icon={<X size={13} />} onClick={() => { setForm(f => ({ ...f, image_url: '' })); setImageWarning('') }}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Or paste an image URL</label>
                <input className="input-base" value={form.image_url?.startsWith('data:') ? '' : (form.image_url || '')} onChange={set('image_url')} placeholder="https://…" />
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                JPG, PNG, WEBP or GIF up to 5 MB. Images are resized automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Selling price */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Selling Price
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div className="form-group">
              <label>Selling price (LKR) *</label>
              <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price} onChange={set('selling_price')} required />
            </div>
            <div className="form-group" style={{ marginTop: 28 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active (available on the POS)
              </label>
            </div>
          </div>
        </div>

{/* Recipe */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
            Recipe (raw materials per one product)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Edit the raw materials and quantities needed to make one unit. Cost per KG is converted to a per-gram cost automatically.
          </p>
          {recipeItems.map((item, idx) => {
            const material = materialsById[item.inventory_item_id]
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px auto', gap: '0 10px', alignItems: 'end', marginBottom: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Raw material</label>
                  <select className="input-base" value={item.inventory_item_id} onChange={(e) => handleRecipeChange(idx, 'inventory_item_id', e.target.value)}>
                    <option value="">Select material</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit}) · {formatCurrency(m.cost_per_unit)}/kg</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Qty ({material?.unit || 'g'})</label>
                  <input
                    className="input-base" type="number" min="0" step="0.001"
                    value={item.quantity_required}
                    onChange={(e) => handleRecipeChange(idx, 'quantity_required', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRecipeRow(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '6px 4px' }}
                  aria-label="Remove ingredient"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addRecipeRow}>
            Add Ingredient
          </Button>

          {/* Live preview — saved values always come from the database trigger */}
          <div className="grid-4" style={{ marginTop: 18, gap: 10 }}>
            {[
              { label: 'New Recipe Cost', value: formatCurrency(previewCost), color: '#3b82f6' },
              { label: 'Selling Price',   value: formatCurrency(previewPrice), color: 'var(--text-primary)' },
              { label: 'Est. Profit',     value: formatCurrency(previewProfit), color: previewProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
              { label: 'Margin',          value: `${previewMargin.toFixed(1)}%`, color: previewMargin >= 25 ? 'var(--success)' : previewMargin >= 10 ? 'var(--warning)' : 'var(--danger)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--content-bg)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 800, color: s.color, marginTop: 3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate(backTo)} type="button">Cancel</Button>
          <Button variant="primary" loading={saving} icon={<Save />} type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}

export default EditProduct
