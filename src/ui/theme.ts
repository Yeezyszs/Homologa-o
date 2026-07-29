// Tokens visuais do design (Claude Design — "Homologacao Sumare").
// Status e risco usam paletas DIFERENTES de propósito, para as duas
// colunas nunca se confundirem na tabela.

import type {
  StatusFornecedor,
  ClassificacaoRisco,
  EstadoItemChecklist,
} from '@/domain/entities'

export interface BadgeMeta {
  label: string
  /** classes do pill: fundo + texto + borda */
  cls: string
  /** cor sólida, para dots e números */
  cor: string
}

/** Semântica de status — verde esmeralda / âmbar / vermelho. */
export const statusMeta: Record<StatusFornecedor, BadgeMeta> = {
  homologado: {
    label: 'Homologado',
    cls: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    cor: '#047857',
  },
  pendente: {
    label: 'Pendente',
    cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    cor: '#B45309',
  },
  nao_homologado: {
    label: 'Não homologado',
    cls: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    cor: '#B91C1C',
  },
}

/** Estado de cada item do checklist — mesma família semântica do status. */
export const estadoMeta: Record<EstadoItemChecklist, BadgeMeta> = {
  ok: {
    label: 'Válido',
    cls: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    cor: '#047857',
  },
  vencido: {
    label: 'Vencido',
    cls: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    cor: '#B91C1C',
  },
  aguardando: {
    label: 'Sem validade informada',
    cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    cor: '#B45309',
  },
  faltando: {
    label: 'Pendente de envio',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    cor: '#64748b',
  },
}

/** Risco — paleta própria (cinza/azul/roxo), nunca a de status. */
export const riscoMeta: Record<ClassificacaoRisco, BadgeMeta> = {
  baixo: {
    label: 'Baixo',
    cls: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
    cor: '#94A3B8',
  },
  medio: {
    label: 'Médio',
    cls: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    cor: '#3B82F6',
  },
  alto: {
    label: 'Alto',
    cls: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
    cor: '#8B5CF6',
  },
}

export function riscoDe(r: ClassificacaoRisco | null): BadgeMeta | null {
  return r ? riscoMeta[r] : null
}

/** Cor do texto de uma data de vencimento conforme a proximidade. */
export function corVencimento(dias: number | null): string {
  if (dias === null) return 'text-slate-600'
  if (dias < 0) return 'text-[#B91C1C]'
  if (dias <= 30) return 'text-[#B45309]'
  return 'text-slate-600'
}

/** Dias entre hoje e uma data ISO (negativo = já passou). */
export function diasAte(dataISO: string | null): number | null {
  if (!dataISO) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataISO + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

/** 2026-07-29 → 29/07/2026 */
export function formatarData(dataISO: string | null): string {
  if (!dataISO) return '—'
  const [a, m, d] = dataISO.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Iniciais para o avatar do header. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/[\s@.]+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}
