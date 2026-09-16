import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/shared/Loader'

const ProtectedRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--content-bg)' }}>
        <Loader size={40} />
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
