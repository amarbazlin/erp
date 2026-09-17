import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RBACProvider } from './context/RBACContext'
import AppRoutes from './routes/AppRoutes'
import PwaControls from './components/layout/PwaControls'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      {/* RBACProvider must be inside AuthProvider so it can read profile.role */}
      <RBACProvider>
        <AppRoutes />
        <PwaControls />
      </RBACProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App