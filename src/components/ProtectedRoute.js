import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute: Un componente de envoltura que protege las rutas privadas.
 * Solo permite acceder a los hijos (children) si el usuario está autenticado.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Mientras se está verificando la autenticación, se muestra la pantalla de carga global.
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  // Si no hay sesión de usuario, se redirige inmediatamente a la página de autentificación.
  if (!user) return <Navigate to="/auth" replace />

  // Si el usuario existe, se renderiza el contenido protegido.
  return children
}
