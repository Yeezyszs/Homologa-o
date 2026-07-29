import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/ui/hooks/useAuth'
import { iniciais } from '@/ui/theme'

const links = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/fornecedores', rotulo: 'Fornecedores' },
  { to: '/segmentos', rotulo: 'Segmentos' },
  { to: '/catalogo', rotulo: 'Catálogo' },
  { to: '/relatorios', rotulo: 'Relatórios' },
]

export function Layout() {
  const { user, sair } = useAuth()
  const email = user?.email ?? ''
  const nome = (user?.user_metadata?.nome as string | undefined) || email.split('@')[0] || 'Usuário'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5">
        <div className="flex min-w-0 shrink items-center gap-4">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <div className="h-[9px] w-[9px] shrink-0 rounded-[2px] bg-marca" />
            <span className="text-[15px] font-bold text-slate-900">Homologação</span>
            <span className="text-sm text-slate-500">· Sumaré</span>
          </div>
          <nav className="flex h-[60px] min-w-0 items-center overflow-hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex h-[60px] shrink-0 items-center whitespace-nowrap border-b-2 px-[10px] text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-marca text-marca'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="min-w-0 overflow-hidden text-right">
            <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">
              {nome}
            </div>
            <button
              onClick={() => void sair()}
              className="text-[11.5px] leading-tight text-slate-500 hover:text-marca"
            >
              Sair
            </button>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca-claro text-[12.5px] font-bold text-marca">
            {iniciais(nome)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-8 pb-16 pt-8">
        <Outlet />
      </main>
    </div>
  )
}
