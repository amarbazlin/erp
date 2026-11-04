import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu } from 'lucide-react'
import { useRBAC } from '../../context/RBACContext'
import { P } from '../../utils/permissions'

const MOBILE_NAV = [
  { path: '/',           label: 'Dashboard', icon: 'LayoutDashboard', permission: P.VIEW_DASHBOARD },
  { path: '/pos',        label: 'POS',       icon: 'ShoppingCart',    permission: P.VIEW_SALES },
  { path: '/sales',      label: 'Sales',     icon: 'FileText',        permission: P.VIEW_SALES },
  { path: '/inventory',  label: 'Inventory', icon: 'Package',         permission: P.VIEW_INVENTORY },
]

const ICON_MAP = {
  LayoutDashboard, ShoppingCart, Package, FileText,
}

export default function MobileNavigation({ onMenu, menuOpen }) {
  const { can } = useRBAC()

  const visible = MOBILE_NAV.filter(item => !item.permission || can(item.permission))

  return (
    <nav className="mobile-navigation" aria-label="Main navigation">
      {visible.map(item => {
        const Icon = ICON_MAP[item.icon]
        return (
          <NavLink key={item.path} to={item.path} end={item.exact} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 6, flex: 1 }}>
            {Icon && <Icon size={20} />}
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </NavLink>
        )
      })}
      <button onClick={onMenu} aria-expanded={menuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Menu size={20} />
        <span style={{ fontSize: 11 }}>More</span>
      </button>
    </nav>
  )
}
