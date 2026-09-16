import React from 'react'
import { PRODUCT_UNITS } from '../../utils/constants'
import { calcMargin } from '../../utils/calculations'

const ProductForm = ({ form, onChange, categories = [], suppliers = [] }) => {
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value })
  const margin = form.buying_price && form.selling_price
    ? calcMargin(parseFloat(form.buying_price), parseFloat(form.selling_price))
    : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <div className="form-group">
          <label>Product Name *</label>
          <input className="input-base" value={form.product_name || ''} onChange={set('product_name')} placeholder="e.g. PVC Pipe 25mm" required />
        </div>
        <div className="form-group">
          <label>Product Code *</label>
          <input className="input-base" value={form.product_code || ''} onChange={set('product_code')} placeholder="e.g. PVC-25-001" required />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select className="input-base" value={form.category_id || ''} onChange={set('category_id')}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Supplier</label>
          <select className="input-base" value={form.supplier_id || ''} onChange={set('supplier_id')}>
            <option value="">Select supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Unit</label>
          <select className="input-base" value={form.unit || 'pcs'} onChange={set('unit')}>
            {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="input-base" value={form.status || 'active'} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label>Initial Quantity</label>
          <input className="input-base" type="number" min="0" value={form.quantity ?? 0} onChange={set('quantity')} />
        </div>
        <div className="form-group">
          <label>Reorder Level</label>
          <input className="input-base" type="number" min="0" value={form.reorder_level ?? 10} onChange={set('reorder_level')} />
        </div>
        <div className="form-group">
          <label>Buying Price (LKR) *</label>
          <input className="input-base" type="number" step="0.01" min="0" value={form.buying_price || ''} onChange={set('buying_price')} placeholder="0.00" required />
        </div>
        <div className="form-group">
          <label>Selling Price (LKR) *</label>
          <input className="input-base" type="number" step="0.01" min="0" value={form.selling_price || ''} onChange={set('selling_price')} placeholder="0.00" required />
        </div>
      </div>
      {margin !== null && (
        <div style={{
          background: margin >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${margin >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 4,
        }}>
          Margin:{' '}
          <strong style={{ color: margin >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>
            {margin.toFixed(1)}%
          </strong>
          {margin < 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>⚠ Selling below cost</span>}
          {margin >= 0 && margin < 10 && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>Low margin — consider adjusting</span>}
        </div>
      )}
    </div>
  )
}

export default ProductForm
