import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completalo.')
}

// El portal de productores guarda su sesión aparte: así entrar al portal con un PAS (por ejemplo, para probar)
// no reemplaza la sesión de administrador del estudio en el mismo navegador, ni al revés.
const esPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, esPortal ? { auth: { storageKey: 'pas-portal-auth' } } : undefined)
