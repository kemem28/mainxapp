import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

// Creación del contexto de autenticación para ser usado en toda la aplicación.
const AuthContext = createContext({})

/**
 * Proveedor de Autenticación: Maneja el estado global del usuario y su perfil.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)          // Datos de la cuenta de auth
  const [profile, setProfile] = useState(null)    // Metadatos adicionales desde la tabla 'profiles'
  const [loading, setLoading] = useState(true)    // Estado de carga inicial

  useEffect(() => {
    // 1. Obtener la sesión inicial al cargar la aplicación.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Suscribirse a cambios en el estado de autenticación (Login, Logout, Token renovado).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Limpieza de la suscripción al desmontar el componente.
    return () => subscription.unsubscribe()
  }, [])

  /**
   * Obtiene la información del perfil del usuario desde la base de datos.
   */
  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  /**
   * Registra un nuevo usuario con metadatos (username, nombre para mostrar).
   */
  async function signUp(email, password, username, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName }
      }
    })
    return { data, error }
  }

  /**
   * Inicia sesión con correo y contraseña.
   */
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  /**
   * Cierra la sesión del usuario actual.
   */
  async function signOut() {
    await supabase.auth.signOut()
  }

  /**
   * Actualiza los datos del perfil del usuario (ej: bio, nombre para mostrar).
   */
  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signUp, signIn, signOut, updateProfile,
      fetchProfile: () => fetchProfile(user?.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para acceder fácilmente al contexto de autenticación.
export const useAuth = () => useContext(AuthContext)
