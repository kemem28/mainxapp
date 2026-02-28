import { createClient } from '@supabase/supabase-js'

// Importación de las credenciales de Supabase desde las variables de entorno.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Inicialización del cliente de Supabase para interactuar con la base de datos y autenticación.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
