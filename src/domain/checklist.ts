// Helpers puros de apresentação do checklist e do status.
// Espelham a regra que mora no Postgres (fonte da verdade), mas aqui servem
// só para derivar rótulos, cores e contagens na UI. Totalmente testáveis.

import type {
  EstadoItemChecklist,
  ItemChecklist,
  StatusFornecedor,
} from './entities'

/** Normaliza uma data (Date | ISO string) para 'YYYY-MM-DD' em horário local. */
export function toDateOnly(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface EntradaEstadoItem {
  temValidade: boolean
  /** há uma versão vigente (is_atual) desse tipo para o fornecedor? */
  temDocumentoAtual: boolean
  /** data de vencimento da versão vigente, quando aplicável */
  dataVencimento: string | null
}

/**
 * Deriva o estado de um item do checklist.
 * Mesma lógica da RPC `get_checklist_fornecedor` no Postgres.
 *
 * - faltando  → não há documento vigente
 * - aguardando → há documento, o tipo tem validade, mas a data ainda não foi informada
 * - vencido   → há documento, tem validade e venceu (< hoje)
 * - ok        → há documento e (não tem validade OU vencimento >= hoje)
 */
export function estadoItemChecklist(
  entrada: EntradaEstadoItem,
  hoje: Date | string = new Date(),
): EstadoItemChecklist {
  const { temValidade, temDocumentoAtual, dataVencimento } = entrada
  if (!temDocumentoAtual) return 'faltando'
  if (!temValidade) return 'ok'
  if (!dataVencimento) return 'aguardando'
  return toDateOnly(dataVencimento) >= toDateOnly(hoje) ? 'ok' : 'vencido'
}

/** Um item obrigatório é considerado satisfeito quando está 'ok'. */
export function itemSatisfeito(item: ItemChecklist): boolean {
  return item.estado === 'ok'
}

/**
 * Deriva o status do fornecedor a partir do checklist já resolvido.
 * Espelha `recalcular_status_fornecedor` (o valor persistido vem do Postgres).
 * Só considera itens obrigatórios; condicionais são ignorados.
 */
export function statusPeloChecklist(itens: ItemChecklist[]): StatusFornecedor {
  const obrigatorios = itens.filter((i) => i.exigencia === 'obrigatorio')
  // "não tem nenhum documento" → nao_homologado
  const temAlgumDocumento = itens.some((i) => i.documento_id !== null)
  if (!temAlgumDocumento) return 'nao_homologado'
  if (obrigatorios.length === 0) return 'homologado'
  return obrigatorios.every(itemSatisfeito) ? 'homologado' : 'pendente'
}

/** Quantos itens obrigatórios ainda faltam ou estão vencidos. */
export function pendenciasObrigatorias(itens: ItemChecklist[]): ItemChecklist[] {
  return itens.filter(
    (i) => i.exigencia === 'obrigatorio' && !itemSatisfeito(i),
  )
}

// ---- Rótulos e cores para a UI ----

export const rotuloStatus: Record<StatusFornecedor, string> = {
  homologado: 'Homologado',
  pendente: 'Pendente',
  nao_homologado: 'Não homologado',
}

export const rotuloEstadoItem: Record<EstadoItemChecklist, string> = {
  ok: 'OK',
  vencido: 'Vencido',
  faltando: 'Faltando',
  aguardando: 'Aguardando validade',
}

/** Classes Tailwind (badge) por status do fornecedor. */
export function classesStatus(status: StatusFornecedor): string {
  switch (status) {
    case 'homologado':
      return 'bg-green-100 text-green-800 ring-green-600/20'
    case 'pendente':
      return 'bg-amber-100 text-amber-800 ring-amber-600/20'
    case 'nao_homologado':
      return 'bg-red-100 text-red-800 ring-red-600/20'
  }
}

/** Classes Tailwind (badge) por estado do item do checklist. */
export function classesEstadoItem(estado: EstadoItemChecklist): string {
  switch (estado) {
    case 'ok':
      return 'bg-green-100 text-green-800 ring-green-600/20'
    case 'vencido':
      return 'bg-red-100 text-red-800 ring-red-600/20'
    case 'faltando':
      return 'bg-slate-100 text-slate-700 ring-slate-500/20'
    case 'aguardando':
      return 'bg-amber-100 text-amber-800 ring-amber-600/20'
  }
}
