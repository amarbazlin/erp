import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RoleGuard from '../components/auth/RoleGuard'
import MainLayout from '../components/layout/MainLayout'
import { P, ROLES } from '../utils/permissions'

// Auth
import Login from '../pages/auth/Login'

// Core pages
import Dashboard        from '../pages/dashboard/Dashboard'
import Inventory        from '../pages/inventory/Inventory'
import AddProduct       from '../pages/inventory/AddProduct'
import EditProduct      from '../pages/inventory/EditProduct'
import Sales            from '../pages/sales/Sales'
import Purchases        from '../pages/purchases/Purchases'
import Suppliers        from '../pages/suppliers/Suppliers'
import Analytics        from '../pages/analytics/Analytics'
import Settings         from '../pages/settings/Settings'

// New feature pages
import Customers        from '../pages/customers/Customers'
import CustomerDetail   from '../pages/customers/CustomerDetail'
import OrderTracking    from '../pages/delivery/OrderTracking'
import Locations        from '../pages/locations/Locations'
import Returns          from '../pages/returns/Returns'

// AI pages
import Forecasting          from '../pages/ai/Forecasting'
import SmartRecommendations from '../pages/ai/SmartRecommendations'
import SeasonalDemand       from '../pages/ai/SeasonalDemand'
import SupplierDiscovery    from '../pages/ai/SupplierDiscovery'

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

        {/* ── Inventory ── */}
        <Route element={<RoleGuard permission={P.VIEW_INVENTORY} />}>
          <Route path="/inventory" element={<Inventory />} />
        </Route>
        <Route element={<RoleGuard permission={P.MANAGE_INVENTORY} />}>
          <Route path="/inventory/add"      element={<AddProduct />} />
          <Route path="/inventory/edit/:id" element={<EditProduct />} />
        </Route>

        {/* ── Customers ── */}
        <Route element={<RoleGuard permission={P.VIEW_CUSTOMERS} />}>
          <Route path="/customers"     element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
        </Route>

        {/* ── Sales ── */}
        <Route element={<RoleGuard permission={P.VIEW_SALES} />}>
          <Route path="/sales" element={<Sales />} />
        </Route>

        {/* ── Purchases ── */}
        <Route element={<RoleGuard permission={P.VIEW_PURCHASES} />}>
          <Route path="/purchases" element={<Purchases />} />
        </Route>

        {/* ── Returns ── */}
        <Route element={<RoleGuard permission={P.VIEW_RETURNS} />}>
          <Route path="/returns" element={<Returns />} />
        </Route>

        {/* ── Order Tracking (Forgera Dispatch) ── */}
        <Route element={<RoleGuard anyOf={[P.VIEW_DELIVERIES, P.VIEW_OWN_DELIVERIES]} />}>
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/deliveries" element={<Navigate to="/order-tracking" replace />} />
        </Route>

        {/* ── Suppliers ── */}
        <Route element={<RoleGuard permission={P.VIEW_SUPPLIERS} />}>
          <Route path="/suppliers" element={<Suppliers />} />
        </Route>

        {/* ── Locations — branch managers and above ── */}
        <Route element={<RoleGuard permission={P.VIEW_ALL_BRANCHES} />}>
          <Route path="/locations" element={<Locations />} />
        </Route>

        {/* ── Analytics ── */}
        <Route element={<RoleGuard permission={P.VIEW_ANALYTICS} />}>
          <Route path="/analytics" element={<Analytics />} />
        </Route>

        

        {/* ── AI pages ── */}
        <Route element={<RoleGuard permission={P.VIEW_AI} />}>
          <Route path="/ai/forecasting"          element={<Forecasting />} />
          <Route path="/ai/recommendations"      element={<SmartRecommendations />} />
          <Route path="/ai/seasonal"             element={<SeasonalDemand />} />
          <Route path="/ai/supplier-discovery"   element={<SupplierDiscovery />} />
        </Route>

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