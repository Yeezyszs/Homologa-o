import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true quando as variáveis do Supabase estão configuradas. */
export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  // Não derruba a aplicação: a UI carrega (útil para preview no GitHub Pages),
  // exibindo um aviso. Apenas as chamadas ao backend é que vão falhar.
  console.warn(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. ' +
      'A interface carrega, mas login e dados não funcionarão até configurar.',
  )
}

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'chave-anon-nao-configurada',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

/** Bucket do Storage onde ficam os PDFs dos documentos. */
export const BUCKET_DOCUMENTOS = 'documentos'
