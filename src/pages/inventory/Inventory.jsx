import React, { useState } from 'react'
import { Package, Cake } from 'lucide-react'
import Materials from './Materials'
import FinishedProducts from './FinishedProducts'

// The Inventory page has two sections: raw-material stock and finished
// products. Both panels share this page wrapper and the tab switcher.
const TABS = [
  { key: 'raw',      label: 'Raw Material Inventory', icon: Package },
  { key: 'products', label: 'Finished Products',      icon: Cake    },
]

const Inventory = () => {
  const [tab, setTab] = useState('raw')

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            Raw-material stock and finished products — recipe cost, profit and availability are calculated from the database.
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div
        className="card"
        style={{
          padding: 6, marginBottom: 20, display: 'inline-flex', gap: 4,
          maxWidth: '100%', overflowX: 'auto',
        }}
      >
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                background: active ? 'linear-gradient(135deg, #f97316, #ea6c00)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
                boxShadow: active ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'raw' ? <Materials /> : <FinishedProducts />}
    </div>
  )
}

export default Inventory
