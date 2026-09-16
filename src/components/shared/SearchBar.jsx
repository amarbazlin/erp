import React from 'react'
import { Search, X } from 'lucide-react'

const SearchBar = ({ value, onChange, placeholder = 'Search...', width = 260 }) => (
  <div style={{ position: 'relative', width }}>
    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 36px 8px 34px',
        border: '1.5px solid var(--card-border)',
        borderRadius: 9,
        fontSize: 13,
        fontFamily: 'DM Sans, sans-serif',
        color: 'var(--text-primary)',
        background: 'var(--card-bg)',
        outline: 'none',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
      >
        <X size={13} color="var(--text-muted)" />
      </button>
    )}
  </div>
)

export default SearchBar
