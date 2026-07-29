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

/**
 * Alguns nós da API do Supabase ficam com o relógio levemente atrasado em
 * relação ao servidor de Auth. Quando isso acontece, o token recém-emitido é
 * recusado com 401 "JWT issued at future" — de forma intermitente, às vezes
 * só em uma das requisições disparadas em paralelo.
 *
 * Como o desvio é de poucos segundos e some sozinho, repetimos uma única vez
 * o request afetado em vez de estourar o erro na cara do usuário. Só entram
 * no retry os 401 com essa assinatura; credencial inválida falha na hora.
 */
const RETRY_MS = 1500

function ehDesvioDeRelogio(corpo: string): boolean {
  return /issued at future|PGRST301/i.test(corpo)
}

const fetchTolerante: typeof fetch = async (input, init) => {
  const resposta = await fetch(input, init)
  if (resposta.status !== 401) return resposta

  let corpo = ''
  try {
    corpo = await resposta.clone().text()
  } catch {
    return resposta
  }
  if (!ehDesvioDeRelogio(corpo)) return resposta

  console.warn('Supabase recusou o token por desvio de relógio; repetindo…')
  await new Promise((r) => setTimeout(r, RETRY_MS))
  return fetch(input, init)
}

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'chave-anon-nao-configurada',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: { fetch: fetchTolerante },
  },
)

/** Bucket do Storage onde ficam os PDFs dos documentos. */
export const BUCKET_DOCUMENTOS = 'documentos'
