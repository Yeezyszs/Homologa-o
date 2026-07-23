import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/ui/hooks/useAuth'

const links = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/fornecedores', rotulo: 'Fornecedores' },
  { to: '/segmentos', rotulo: 'Segmentos' },
  { to: '/catalogo', rotulo: 'Catálogo' },
]

export function Layout() {
  const { user, sair } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <div className="font-semibold text-slate-800">
            Homologação <span className="text-slate-400">· Sumaré</span>
          </div>
          <nav className="flex gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => void sair()}
              className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
