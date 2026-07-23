import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/ui/hooks/useAuth'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">
        Carregando…
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
