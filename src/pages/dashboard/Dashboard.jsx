import React from 'react'
import SalesReport from '../../components/shared/SalesReport'
import InventoryOverview from '../../components/shared/InventoryOverview'

export default function Dashboard() {
  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Sales, orders & inventory insights</p>
      </div>
      <SalesReport />
      <InventoryOverview />
    </div>
  )
}
