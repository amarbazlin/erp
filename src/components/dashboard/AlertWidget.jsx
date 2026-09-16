import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ArrowRight } from 'lucide-react'
import { formatRelative } from '../../utils/formatters'

const SEVERITY_DOT = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#3b82f6',
}

const AlertWidget = ({ alerts = [], loading = false }) => {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div style={{ padding: '12px 0' }}>
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 46, borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <Bell size={24} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 8px' }} />
        No active alerts
      </div>
    )
  }

  return (
    <div>
      {alerts.map(alert => (
        <div
          key={alert.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 0', borderBottom: '1px solid #f3f4f6',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/alerts')}
        >
          <div style={{
            width: 7, height: 7, borderRadius: 99,
            background: SEVERITY_DOT[alert.severity] || '#9ca3af',
            flexShrink: 0, marginTop: 5,
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {alert.message}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {formatRelative(alert.created_at)}
            </p>
          </div>
          <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
        </div>
      ))}
      <button
        onClick={() => navigate('/alerts')}
        style={{
          width: '100%', marginTop: 10, padding: '8px',
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 12.5, color: '#f97316', fontWeight: 600,
          fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        View all alerts <ArrowRight size={13} />
      </button>
    </div>
  )
}

export default AlertWidget
