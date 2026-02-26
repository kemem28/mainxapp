import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - reemplaza con tus credenciales
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'tu-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
