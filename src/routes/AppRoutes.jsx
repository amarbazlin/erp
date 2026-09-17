import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RoleGuard from '../components/auth/RoleGuard'
import MainLayout from '../components/layout/MainLayout'
import { P } from '../utils/permissions'

// Auth
import Login from '../pages/auth/Login'

// Core pages
import Dashboard      from '../pages/dashboard/Dashboard'
import Pos            from '../pages/pos/Pos'
import Products       from '../pages/products/Products'
import AddProduct     from '../pages/products/AddProduct'
import EditProduct    from '../pages/products/EditProduct'
import Inventory      from '../pages/inventory/Inventory'
import Customers      from '../pages/customers/Customers'
import CustomerDetail from '../pages/customers/CustomerDetail'
import Settings       from '../pages/settings/Settings'

// Access denied
import { AccessDenied } from '../components/auth/RoleGuard'

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    {/* ── All routes require authentication ── */}
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>

        {/* Dashboard — every authenticated role */}
        <Route index element={<Dashboard />} />

        {/* ── POS / Sales ── */}
        <Route element={<RoleGuard permission={P.VIEW_SALES} />}>
          <Route path="/pos" element={<Pos />} />
        </Route>

        {/* ── Products & recipes ── */}
        <Route element={<RoleGuard permission={P.VIEW_PRODUCTS} />}>
          <Route path="/products" element={<Products />} />
        </Route>
        <Route element={<RoleGuard permission={P.MANAGE_PRODUCTS} />}>
          <Route path="/products/add"      element={<AddProduct />} />
          <Route path="/products/edit/:id" element={<EditProduct />} />
        </Route>

        {/* ── Inventory: raw materials + finished products ── */}
        <Route element={<RoleGuard permission={P.VIEW_INVENTORY} />}>
          <Route path="/inventory" element={<Inventory />} />
        </Route>

        {/* ── Customers ── */}
        <Route element={<RoleGuard permission={P.VIEW_CUSTOMERS} />}>
          <Route path="/customers"     element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
        </Route>

        {/* Legacy Analytics links now open the unified Dashboard. */}
        <Route path="/analytics" element={<Navigate to="/" replace />} />

        {/* ── Settings — everyone, but tabs gated internally ── */}
        <Route path="/settings" element={<Settings />} />

        {/* ── Access denied page ── */}
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Route>
  </Routes>
)

export default AppRoutes