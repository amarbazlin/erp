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
import Sales          from '../pages/sales/Sales'
// Product forms are reached from the Inventory page's Finished Products tab —
// the standalone Products list page was removed, so there is no Products page
// import here.
import AddProduct     from '../pages/products/AddProduct'
import EditProduct    from '../pages/products/EditProduct'
import Inventory      from '../pages/inventory/Inventory'
import Customers      from '../pages/customers/Customers'
import CustomerDetail from '../pages/customers/CustomerDetail'
import Settings       from '../pages/settings/Settings'
import Finance from '../pages/finance/Finance'


// Access denied
import { AccessDenied } from '../components/auth/RoleGuard'

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    {/* ── All routes require authentication ── */}
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>

        {/* Dashboard — admin/manager; cashier lands on POS */}
        <Route element={<RoleGuard permission={P.VIEW_DASHBOARD} redirectTo="/pos" />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* ── POS / Sales ── */}
        <Route element={<RoleGuard permission={P.VIEW_SALES} />}>
          <Route path="/pos" element={<Pos />} />
          <Route path="/sales" element={<Sales />} />
        </Route>

        {/* ── Product add / edit forms ──
            There is no standalone Products page any more; finished products are
            managed from the Inventory page, which links into these forms. */}
        <Route element={<RoleGuard permission={P.MANAGE_PRODUCTS} />}>
          <Route path="/products/add"      element={<AddProduct />} />
          <Route path="/products/edit/:id" element={<EditProduct />} />
        </Route>

        {/* The old /products list route — keep it working as a redirect. */}
        <Route path="/products" element={<Navigate to="/inventory" replace />} />

        {/* ── Inventory: raw materials + finished products ── */}
        <Route element={<RoleGuard permission={P.VIEW_INVENTORY} />}>
          <Route path="/inventory" element={<Inventory />} />
        </Route>

        {/* ── Customers ── */}
        <Route element={<RoleGuard permission={P.VIEW_CUSTOMERS} />}>
          <Route path="/customers"     element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
        </Route>

        <Route path="/finance" element={<Finance />} />

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