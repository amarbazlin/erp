// MetricCard.jsx
import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

const MetricCard = ({ title, value, change, changeLabel, icon: Icon, color, loading, onClick }) => (
  <div
    className="card"
    style={{ padding: '20px 22px', cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
    onClick={onClick}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{title}</span>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    {loading ? (
      <div className="skeleton" style={{ height: 26, width: '55%', marginBottom: 8, borderRadius: 6 }} />
    ) : (
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
        {value}
      </div>
    )}
    {change !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        {change >= 0
          ? <><ArrowUpRight size={13} color="var(--success)" /><span style={{ color: 'var(--success)', fontWeight: 600 }}>+{change.toFixed(1)}%</span></>
          : <><ArrowDownRight size={13} color="var(--danger)" /><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{change.toFixed(1)}%</span></>
        }
        <span style={{ color: 'var(--text-muted)' }}>{changeLabel || 'vs last month'}</span>
      </div>
    )}
  </div>
)

export default MetricCard
