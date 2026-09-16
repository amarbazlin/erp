import React, { useState, useEffect } from 'react'
import { Search, Truck, ChevronDown, ChevronUp } from 'lucide-react'
import { supplierService } from '../../services/supplierService'
import Loader from '../../components/shared/Loader'
import { formatCurrencyShort } from '../../utils/formatters'

// ─ Supplier performance card ─────────────────────────────────────────────────
const SupplierCard = ({ supplier, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false)

  const score = Math.max(0, Math.min(100,
    100
    - (supplier.avg_delivery_days || 3) * 5
    + (supplier.orderCount || 0) * 2
  ))

  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div
      style={{
        border: `1.5px solid ${selected ? '#f97316' : 'var(--card-border)'}`,
        borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s',
        background: selected ? '#fff7ed' : 'var(--card-bg)',
      }}
    >
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={() => onSelect(supplier)}
      >
        {/* Selection indicator */}
        <div style={{
          width: 18, height: 18, borderRadius: 99, flexShrink: 0,
          border: `2px solid ${selected ? '#f97316' : 'var(--card-border)'}`,
          background: selected ? '#f97316' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#fff' }} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
            {supplier.supplier_name}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span>📞 {supplier.phone || 'No phone'}</span>
            <span>🚚 {supplier.average_delivery_days || '?'} day lead</span>
            <span>📦 {supplier.orderCount || 0} orders</span>
          </div>
        </div>

        {/* Performance score */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 800, color: scoreColor }}>{score}</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>SCORE</div>
          <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 3 }}>
            <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 99 }} />
          </div>
        </div>

        <button onClick={e => { e.stopPropagation(); setExpanded(o => !o) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ paddingTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {supplier.email && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>✉ {supplier.email}</div>
            )}
            {supplier.address && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>📍 {supplier.address}</div>
            )}
            {supplier.totalPurchases > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                💰 Total purchased: <strong style={{ fontFamily: 'Outfit,sans-serif' }}>{formatCurrencyShort(supplier.totalPurchases)}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SupplierDiscovery = () => {
  const [suppliers,       setSuppliers]       = useState([])
  const [loadingData,     setLoadingData]     = useState(true)
  const [selectedSupplier,setSelectedSupplier]= useState(null)

  useEffect(() => {
    const load = async () => {
      setLoadingData(true)
      try {
        const [sups, perf] = await Promise.all([
          supplierService.getAll({ status: 'active' }),
          supplierService.getPerformance(),
        ])
        // Merge performance data into suppliers
        const perfMap = {}
        for (const p of perf) {
          const match = sups.find(s => s.supplier_name === p.supplier_name)
          if (match) perfMap[match.id] = p
        }
        const enriched = sups.map(s => ({ ...s, ...perfMap[s.id] }))
        setSuppliers(enriched)
      } catch (err) { console.error(err) }
      finally { setLoadingData(false) }
    }
    load()
  }, [])

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#ea6c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={16} color="#fff" />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Supplier Discovery</h1>
          </div>
          <p className="page-subtitle">Supplier delivery lead times and order frequency performance</p>
        </div>
      </div>

      {/* ── Performance Scores ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Loader size={36} /></div>
          ) : suppliers.length === 0 ? (
            <div className="empty-state card" style={{ padding: 60 }}>
              <Truck size={36} strokeWidth={1.5} />
              <h3>No suppliers yet</h3>
              <p>Add suppliers in the Suppliers page first</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 9, fontSize: 12.5, color: '#92400e', marginBottom: 4 }}>
                <strong>How scores work:</strong> Based on delivery lead time and order frequency.
              </div>
              {[...suppliers]
                .sort((a, b) => {
                  const scoreA = 100 - (a.average_delivery_days || 3) * 5 + (a.orderCount || 0) * 2
                  const scoreB = 100 - (b.average_delivery_days || 3) * 5 + (b.orderCount || 0) * 2
                  return scoreB - scoreA
                })
                .map(s => (
                  <SupplierCard
                    key={s.id}
                    supplier={s}
                    selected={selectedSupplier?.id === s.id}
                    onSelect={setSelectedSupplier}
                  />
                ))}
            </>
          )}
        </div>
    </div>
  )
}

export default SupplierDiscovery
