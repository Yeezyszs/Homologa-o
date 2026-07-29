// Regras puras do checklist. Espelham o que roda no Postgres (fonte da
// verdade) e servem para derivar contagens e rótulos na UI.
// Sem React, sem Supabase, sem classes de CSS — só regra de negócio.

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
  /** datas de vencimento dos arquivos vigentes (vazio = nenhum arquivo) */
  vencimentos: (string | null)[]
}

/**
 * Deriva o estado de um item do checklist a partir dos arquivos vigentes.
 * Mesma lógica da RPC `get_checklist_fornecedor`.
 *
 * Tipos com múltiplos arquivos seguem a regra "basta um válido":
 * o item fica `ok` se ao menos um arquivo estiver vigente.
 *
 * - faltando   → nenhum arquivo vigente
 * - ok         → tipo sem validade, ou ao menos um arquivo dentro do prazo
 * - aguardando → há arquivo, o tipo tem validade e falta informar a data
 * - vencido    → há arquivos com data e todos já venceram
 */
export function estadoItemChecklist(
  entrada: EntradaEstadoItem,
  hoje: Date | string = new Date(),
): EstadoItemChecklist {
  const { temValidade, vencimentos } = entrada
  if (vencimentos.length === 0) return 'faltando'
  if (!temValidade) return 'ok'

  const limite = toDateOnly(hoje)
  const temValido = vencimentos.some(
    (v) => v !== null && toDateOnly(v) >= limite,
  )
  if (temValido) return 'ok'
  if (vencimentos.some((v) => v === null)) return 'aguardando'
  return 'vencido'
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
  const temAlgumDocumento = itens.some((i) => i.qtd_arquivos > 0)
  if (!temAlgumDocumento) return 'nao_homologado'
  if (obrigatorios.length === 0) return 'homologado'
  return obrigatorios.every(itemSatisfeito) ? 'homologado' : 'pendente'
}

/** Quantos itens obrigatórios ainda faltam ou estão vencidos. */
export function pendenciasObrigatorias(itens: ItemChecklist[]): ItemChecklist[] {
  return itens.filter((i) => i.exigencia === 'obrigatorio' && !itemSatisfeito(i))
}
