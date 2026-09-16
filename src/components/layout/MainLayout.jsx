import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAlerts } from '../../hooks/useAlerts'
import useReorderScheduler from '../../hooks/useReorderScheduler'
import ReorderNotificationModal from '../reorder/ReorderNotificationModal'
import { useBreakpoint } from '../../hooks/useBreakpoint'

const MainLayout = () => {
  const { unresolvedCount } = useAlerts()
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

  const {
    modalOpen,
    supplierGroups,
    loading: reorderLoading,
    dismissModal,
    triggerNow,
  } = useReorderScheduler()

  const toggleSidebar = () => setSidebarOpen(o => !o)
  const closeSidebar  = () => setSidebarOpen(false)

  return (
    <div style={styles.root}>
      {/* ── Backdrop (mobile only) ── */}
      {isCompact && (
        <div
          className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        alertCount={unresolvedCount}
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
          alertCount={unresolvedCount}
          onToggleSidebar={toggleSidebar}
          isMobile={isCompact}
          onTestReorder={triggerNow}
        />
        <div style={styles.content}>
          <Outlet />
        </div>
      </div>

      {/* ── Reorder modal ── */}
      <ReorderNotificationModal
        open={modalOpen}
        supplierGroups={supplierGroups}
        loading={reorderLoading}
        onDismiss={dismissModal}
      />
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