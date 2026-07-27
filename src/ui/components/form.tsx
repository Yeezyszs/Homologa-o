import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes } from 'react'

const base =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50'

export function Campo({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  )
}

export function Botao({
  children,
  variante = 'primario',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'perigo'
  children: ReactNode
}) {
  const estilos: Record<string, string> = {
    primario: 'bg-slate-900 text-white hover:bg-slate-800',
    secundario: 'border border-slate-300 text-slate-700 hover:bg-slate-100',
    perigo: 'text-red-600 hover:bg-red-50',
  }
  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 ${estilos[variante]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export const CATEGORIAS = [
  { valor: 'produto', rotulo: 'Produto' },
  { valor: 'servico', rotulo: 'Serviço' },
  { valor: 'equipamento', rotulo: 'Equipamento' },
  { valor: 'transporte', rotulo: 'Transporte' },
] as const

export const RISCOS = [
  { valor: 'alto', rotulo: 'Alto' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'baixo', rotulo: 'Baixo' },
] as const
