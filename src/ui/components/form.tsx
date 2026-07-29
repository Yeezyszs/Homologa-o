import type {
  ReactNode,
  SelectHTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const base =
  'mt-1 w-full rounded-lg border border-slate-200 px-3 py-[9px] text-[13.5px] text-slate-900 disabled:bg-slate-50'

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Checkbox({
  label,
  descricao,
  checked,
  onChange,
}: {
  label: string
  descricao?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2.5 text-[13.5px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-marca focus:ring-marca"
      />
      <span>
        {label}
        {descricao && <span className="block text-xs text-slate-500">{descricao}</span>}
      </span>
    </label>
  )
}

export function Botao({
  children,
  variante = 'primario',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'suave' | 'perigo'
  children: ReactNode
}) {
  const estilos: Record<string, string> = {
    primario: 'bg-marca text-white hover:bg-marca-escuro',
    secundario: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    suave: 'bg-marca-claro text-marca hover:bg-marca-claro-hover',
    perigo: 'border border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]',
  }
  return (
    <button
      {...props}
      className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${estilos[variante]} ${props.className ?? ''}`}
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
