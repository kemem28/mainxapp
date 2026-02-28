import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import './styles/globals.css'

/**
 * AppRoutes gestiona la lógica de navegación basada en el estado de autenticación.
 */
function AppRoutes() {
  const { user, loading } = useAuth()

  // Mientras se verifica la sesión del usuario, se muestra una pantalla de carga.
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      {/* 
          Ruta de autenticación: 
          Si el usuario ya está logueado, lo redirige al Home. 
          Si no, muestra la página de login/registro. 
      */}
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />

      {/* 
          Ruta principal (Home): 
          Protegida por ProtectedRoute; si no hay usuario, redirige a /auth. 
      */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto para cualquier ruta no encontrada. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Componente raíz: envuelve la app en el Router y el proveedor de autenticación.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
