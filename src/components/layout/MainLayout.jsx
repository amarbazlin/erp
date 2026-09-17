import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileNavigation from './MobileNavigation'
import { supabase } from '../../services/supabase'
import { useBreakpoint } from '../../hooks/useBreakpoint'

// Live count of low-stock raw materials (badge on bell icon)
const useLowStockCount = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let active = true
    const load = () => {
      supabase
        .from('inventory_items')
        .select('current_quantity, low_stock_threshold', { count: 'exact' })
        .eq('is_active', true)
        .then(({ data }) => {
          if (!active) return
          setCount((data || []).filter(i => parseFloat(i.current_quantity) <= parseFloat(i.low_stock_threshold)).length)
        })
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { active = false; clearInterval(interval) }
  }, [])
  return count
}

const MainLayout = () => {
  const lowStockCount = useLowStockCount()
  const { isMobile, isTablet } = useBreakpoint()
  const isCompact = isMobile || isTablet
  const location = useLocation()

  // Sidebar open state — closed by default on mobile, always open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(!isCompact)

  // Close sidebar on route change (mobile / tablet)
  useEffect(() => {
    if (isCompact) setSidebarOpen(false)
  }, [location.pathname, isCompact])

  // When screen resizes to desktop, keep sidebar open
  useEffect(() => {
    if (!isCompact) setSidebarOpen(true)
  }, [isCompact])

  const toggleSidebar = () => setSidebarOpen(o => !o)
  const closeSidebar  = () => setSidebarOpen(false)

  return (
    <div className="app-shell" style={styles.root}>
      {/* ── Backdrop (mobile only) ── */}
      {isCompact && (
        <div
          className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        alertCount={lowStockCount}
        isOpen={sidebarOpen}
        isMobile={isCompact}
        onClose={closeSidebar}
      />

      {/* ── Main area ── */}
      <div
        style={{
          ...styles.main,
          marginLeft: isCompact ? 0 : 'var(--sidebar-width)',
          transition: 'margin-left 0.25s ease',
        }}
      >
        <Navbar
          alertCount={lowStockCount}
          onToggleSidebar={toggleSidebar}
          isMobile={isCompact}
        />
        <div className="app-content" style={styles.content}>
          <Outlet />
        </div>
        {isMobile && <MobileNavigation onMenu={toggleSidebar} menuOpen={sidebarOpen} />}
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--content-bg)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
}

export default MainLayout