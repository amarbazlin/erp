// CustomerSelect.jsx — searchable dropdown for use in sale/delivery forms
import React, { useState, useEffect, useRef } from 'react'
import { Search, User, ChevronDown, X } from 'lucide-react'
import { customerService } from '../../services/customerService'

export const CreditStatusBadge = ({ creditLimit, currentBalance }) => {
  if (!creditLimit || creditLimit === 0) {
    return (
      <span style={{ fontSize: 11, background: 'var(--content-bg)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
        Cash only
      </span>
    )
  }

  const used    = parseFloat(currentBalance) || 0
  const limit   = parseFloat(creditLimit)
  const pct     = Math.min(100, (used / limit) * 100)
  const isOver  = used > limit
  const isHigh  = pct >= 80 && !isOver
  const color   = isOver ? '#dc2626' : isHigh ? '#d97706' : '#16a34a'
  const bg      = isOver ? '#fef2f2' : isHigh ? '#fffbeb' : '#f0fdf4'
  const label   = isOver ? 'Over limit' : isHigh ? 'Near limit' : 'Good standing'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ background: bg, color, padding: '1px 8px', borderRadius: 99, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          {label}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
          Rs.{used.toFixed(0)} / Rs.{limit.toFixed(0)}
        </span>
      </div>
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}



export const CustomerSelect = ({ value, onChange, placeholder = 'Select customer (optional)' }) => {
  const [open,      setOpen]      = useState(false)
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [selected,  setSelected]  = useState(value || null)
  const [loading,   setLoading]   = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await customerService.search(query)
        setResults(data || [])
      } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (customer) => {
    setSelected(customer)
    onChange(customer)
    setOpen(false)
    setQuery('')
  }

  const handleClear = () => {
    setSelected(null)
    onChange(null)
  }

  const TYPE_COLORS = { retail: '#3b82f6', contractor: '#f97316', wholesale: '#8b5cf6', vip: '#22c55e' }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', border: '1.5px solid var(--card-border)',
          borderRadius: 9, background: 'var(--card-bg)', cursor: 'pointer',
          borderColor: open ? 'var(--accent)' : 'var(--card-border)',
          boxShadow: open ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        <User size={14} color={selected ? '#f97316' : 'var(--text-muted)'} />
        {selected ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {selected.phone} · Balance: Rs.{parseFloat(selected.current_balance || 0).toFixed(0)}
            </div>
          </div>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>{placeholder}</span>
        )}
        {selected ? (
          <button onClick={(e) => { e.stopPropagation(); handleClear() }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={13} color="var(--text-muted)" />
          </button>
        ) : (
          <ChevronDown size={14} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 500,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, color: 'var(--text-primary)', background: 'transparent', fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '12px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                {query ? 'No customers found' : 'Type to search customers…'}
              </div>
            ) : results.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--content-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${TYPE_COLORS[c.customer_type] || '#6b7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: TYPE_COLORS[c.customer_type] || '#6b7280', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}>
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    <span>{c.phone}</span>
                    {c.current_balance > 0 && <span style={{ color: '#d97706' }}>Owes Rs.{parseFloat(c.current_balance).toFixed(0)}</span>}
                    {c.price_tiers?.discount_percent > 0 && <span style={{ color: '#22c55e' }}>{c.price_tiers.discount_percent}% off</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10.5, background: `${TYPE_COLORS[c.customer_type]}18`, color: TYPE_COLORS[c.customer_type] || '#6b7280', padding: '2px 7px', borderRadius: 99, fontWeight: 600, textTransform: 'capitalize' }}>
                  {c.customer_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerSelect
