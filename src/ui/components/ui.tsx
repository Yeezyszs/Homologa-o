// Componentes de apresentação compartilhados, no vocabulário visual do design.
import type { ReactNode } from 'react'

/** Pill de status/estado/risco — borda 1px, fundo claro, texto forte. */
export function Pill({ children, cls = '' }: { children: ReactNode; cls?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-[3px] text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  )
}

/** Indicador de risco: dot colorido + label (paleta distinta da de status). */
export function Dot({ cor }: { cor: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: cor }}
    />
  )
}

export function Cabecalho({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo?: string
  acao?: ReactNode
}) {
  return (
    <div className="mb-[22px] flex items-baseline justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[13.5px] text-slate-500">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`card ${className}`}>{children}</div>
}

export function TituloCard({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-bold text-slate-900">{children}</h2>
      {extra}
    </div>
  )
}

/** Card de KPI do dashboard. */
export function Kpi({
  rotulo,
  valor,
  cor = 'text-slate-900',
}: {
  rotulo: string
  valor: number | string
  cor?: string
}) {
  return (
    <div className="card p-5">
      <div className="text-[12.5px] font-semibold text-slate-500">{rotulo}</div>
      <div className={`mt-2 text-[28px] font-bold leading-none ${cor}`}>{valor}</div>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="px-[22px] py-12 text-center text-[13.5px] text-slate-400">{children}</div>
  )
}

export function Carregando({ texto = 'Carregando dados…' }: { texto?: string }) {
  return <div className="p-20 text-center text-sm text-slate-400">{texto}</div>
}

export function Erro({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13.5px] text-[#B91C1C]">
      {children}
    </div>
  )
}
