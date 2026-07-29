import type { ReactNode } from 'react'

export function Modal({
  titulo,
  aberto,
  onFechar,
  children,
  largura = 'max-w-lg',
}: {
  titulo: string
  aberto: boolean
  onFechar: () => void
  children: ReactNode
  largura?: string
}) {
  if (!aberto) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      onClick={onFechar}
    >
      <div
        className={`w-full ${largura} max-h-[90vh] overflow-y-auto rounded-card bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-slate-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
