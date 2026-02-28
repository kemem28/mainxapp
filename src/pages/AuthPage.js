import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

/**
 * Página de Autenticación: Permite al usuario iniciar sesión o crear una cuenta.
 */
export default function AuthPage() {
  const [mode, setMode] = useState('login') // Alterna entre 'login' y 'register'
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' })
  const [error, setError] = useState('')      // Almacena errores de validación o del servidor
  const [loading, setLoading] = useState(false) // Indica si hay una petición en curso
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  /**
   * Actualiza los valores del formulario al escribir.
   */
  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('') // Limpia el error al empezar a escribir
  }

  /**
   * Procesa el envío del formulario.
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      // Intento de inicio de sesión
      const { error } = await signIn(form.email, form.password)
      if (error) setError(error.message)
      else navigate('/') // Redirige al Home si es exitoso
    } else {
      // Validaciones para registro
      if (!form.username.trim()) { setError('El nombre de usuario es requerido'); setLoading(false); return }
      if (form.username.includes(' ')) { setError('El nombre de usuario no puede tener espacios'); setLoading(false); return }

      // Intento de creación de cuenta
      const { error } = await signUp(form.email, form.password, form.username.toLowerCase(), form.displayName || form.username)
      if (error) setError(error.message)
      else {
        setError('')
        navigate('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow" />
      </div>

      <div className="auth-card fade-in">
        <div className="auth-header">
          <h1 className="auth-logo">Chattr</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              {/* Campos exclusivos para el modo Registro */}
              <div className="form-group">
                <label>Nombre de usuario</label>
                <input
                  name="username"
                  placeholder="@tunombre"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Nombre para mostrar</label>
                <input
                  name="displayName"
                  placeholder="Tu nombre"
                  value={form.displayName}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-switch">
          {/* Botón para cambiar entre Login y Registro */}
          {mode === 'login' ? (
            <p>¿No tienes cuenta? <button onClick={() => setMode('register')}>Regístrate</button></p>
          ) : (
            <p>¿Ya tienes cuenta? <button onClick={() => setMode('login')}>Inicia sesión</button></p>
          )}
        </div>
      </div>
    </div>
  )
}
