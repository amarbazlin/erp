import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users2, ShoppingCart,
  Cake, BarChart3, Settings, Sparkles, X
} from 'lucide-react'
import { useRBAC } from '../../context/RBACContext'
import { P } from '../../utils/permissions'
import AppLogo from '../shared/AppLogo'

const ICON_MAP = {
  LayoutDashboard, Package, Users2, ShoppingCart,
  Cake, BarChart3, Settings,
}

const NAV = [
  { path: '/',           label: 'Dashboard',  icon: 'LayoutDashboard', exact: true,  permission: null                },
  { path: '/pos',        label: 'POS / Sales', icon: 'ShoppingCart',                  permission: P.VIEW_SALES        },
  { path: '/products',   label: 'Products',   icon: 'Cake',                          permission: P.VIEW_PRODUCTS     },
  { path: '/inventory',  label: 'Inventory',  icon: 'Package',                       permission: P.VIEW_INVENTORY    },
  { path: '/customers',  label: 'Customers',  icon: 'Users2',                        permission: P.VIEW_CUSTOMERS    },
  { path: '/analytics',  label: 'Analytics',  icon: 'BarChart3',                     permission: P.VIEW_ANALYTICS    },
]

const Sidebar = ({ alertCount = 0, isOpen, isMobile, onClose }) => {
  const location  = useLocation()
  const { can }   = useRBAC()

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  // Filter nav items the current user has permission to see
  const visibleNav = NAV.filter(item =>
    !item.permission || can(item.permission)
  )

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside style={{
        ...S.sidebar,
        transform: isMobile
          ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'translateX(0)',
        transition: 'transform 0.25s ease',
        boxShadow: isMobile && isOpen ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
      }}>
        {/* Logo + mobile close button */}
        <div style={S.logoArea}>
          <div style={S.logoIcon}><AppLogo size={26} /></div>
          <div style={{ flex: 1 }}>
            <div style={S.logoText}>Forgera ERP</div>
            <div style={S.logoSub}>Inventory Intelligence</div>
          </div>
          {/* Close button — mobile only */}
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.07)', border: 'none',
                borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={15} color="#9ca3af" />
            </button>
          )}
        </div>

        <div style={S.sectionLabel}>MENU</div>

        <nav style={S.nav}>
          {/* Main nav items — filtered by permission */}
          {visibleNav.map(item => {
            const Icon   = ICON_MAP[item.icon]
            const active = isActive(item.path, item.exact)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => isMobile && onClose()}
                style={({ isActive: navActive }) => ({
                  ...S.navItem,
                  ...(navActive ? S.navItemActive : {}),
                })}
              >
                {Icon && <Icon size={15} color={active ? '#f97316' : '#6b7280'} />}
                <span style={S.navLabel}>{item.label}</span>
                {item.badge && alertCount > 0 && (
                  <span style={S.badge}>{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </NavLink>
            )
          })}

          {/* Settings — always visible */}
          <NavLink
            to="/settings"
            onClick={() => isMobile && onClose()}
            style={({ isActive: navActive }) => ({ ...S.navItem, ...(navActive ? S.navItemActive : {}) })}
          >
            <Settings size={15} color={location.pathname === '/settings' ? '#f97316' : '#6b7280'} />
            <span style={S.navLabel}>Settings</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.footerIcon}><Sparkles size={13} color="#f97316" /></div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
              ForgeraERP v2.0
            </div>
            <div style={{ fontSize: 10.5, color: '#4b5563', marginTop: 1 }}>Powered by Forgera</div>
          </div>
        </div>
      </aside>
    </>
  )
}

const S = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    height: '100vh',
    background: '#0d1117',
    borderRight: '1px solid #1e2530',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0, left: 0,
    zIndex: 100,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logoArea: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '18px 14px 14px',
    borderBottom: '1px solid #1e2530', flexShrink: 0,
  },
  logoIcon: {
    width: 34, height: 34, borderRadius: 8,
    background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 4px 10px rgba(249,115,22,0.2)',
    overflow: 'hidden',
    padding: 2,
  },
  logoText: { fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' },
  logoSub:  { fontSize: 9.5, color: '#4b5563', marginTop: 1 },
  sectionLabel:  { fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: '#374151', padding: '14px 16px 5px', fontFamily: 'Outfit,sans-serif', flexShrink: 0 },
  sectionLabel2: { fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: '#374151', padding: '12px 16px 4px', fontFamily: 'Outfit,sans-serif' },
  nav:  { display: 'flex', flexDirection: 'column', gap: 1, padding: '0 7px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 10px', borderRadius: 7,
    textDecoration: 'none', color: '#8b949e',
    fontSize: 13, fontWeight: 450, transition: 'all 0.12s',
    fontFamily: 'DM Sans,sans-serif',
    WebkitTapHighlightColor: 'transparent',
    minHeight: 38,     // larger touch targets on mobile
  },
  navItemActive: { background: 'rgba(249,115,22,0.1)', color: '#fff' },
  navLabel: { flex: 1 },
  badge: {
    background: '#f97316', color: '#fff', fontSize: 9.5,
    fontWeight: 700, borderRadius: 99, padding: '1px 5px',
    fontFamily: 'Outfit,sans-serif',
  },
  subMenu: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 7, marginBottom: 2 },
  subItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 6,
    textDecoration: 'none', fontSize: 12.5,
    transition: 'all 0.12s', fontFamily: 'DM Sans,sans-serif',
    paddingLeft: 14,
    WebkitTapHighlightColor: 'transparent',
    minHeight: 36,
  },
  footer: {
    margin: '10px 7px 14px', padding: '11px 12px',
    background: '#161b22', border: '1px solid #1e2530',
    borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  },
  footerIcon: {
    width: 26, height: 26, borderRadius: 7,
    background: 'rgba(249,115,22,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
}

export default Sidebar