import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, Menu } from 'lucide-react'

export default function MobileNavigation({ onMenu, menuOpen }) {
  return (
    <nav className="mobile-navigation" aria-label="Main navigation">
      <NavLink to="/" end><LayoutDashboard size={20} /><span>Dashboard</span></NavLink>
      <NavLink to="/pos"><ShoppingCart size={20} /><span>Sales</span></NavLink>
      <NavLink to="/inventory"><Package size={20} /><span>Inventory</span></NavLink>
      <button onClick={onMenu} aria-expanded={menuOpen}><Menu size={20} /><span>More</span></button>
    </nav>
  )
}
