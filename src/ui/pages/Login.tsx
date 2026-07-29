import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/ui/hooks/useAuth'
import { supabaseConfigurado } from '@/infrastructure/supabase/client'
import { Campo, Input, Botao } from '@/ui/components/form'

export function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destino = (location.state as { from?: Location })?.from?.pathname ?? '/'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email, senha)
      navigate(destino, { replace: true })
    } catch {
      setErro('E-mail ou senha inválidos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2">
          <div className="h-[9px] w-[9px] rounded-[2px] bg-marca" />
          <span className="text-[15px] font-bold text-slate-900">Homologação</span>
          <span className="text-sm text-slate-500">· Sumaré</span>
        </div>
        <p className="text-[13px] text-slate-500">
          Gestão e homologação de fornecedores. Acesso interno.
        </p>

        {!supabaseConfigurado && (
          <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#B45309]">
            <strong className="font-semibold">Preview sem backend.</strong> O Supabase não foi
            configurado, então login e dados não funcionam aqui.
          </div>
        )}

        <Campo label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo label="Senha">
          <Input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>

        {erro && (
          <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">
            {erro}
          </p>
        )}

        <Botao type="submit" disabled={enviando} className="w-full py-2.5 text-[13.5px]">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>
    </div>
  )
}
