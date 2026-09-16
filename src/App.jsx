import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RBACProvider } from './context/RBACContext'
import AppRoutes from './routes/AppRoutes'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      {/* RBACProvider must be inside AuthProvider so it can read profile.role */}
      <RBACProvider>
        <AppRoutes />
      </RBACProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App