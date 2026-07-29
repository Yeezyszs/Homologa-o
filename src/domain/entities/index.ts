// Tipos do negócio (pt-BR). Sem dependência de React nem Supabase.

export type Papel = 'admin' | 'comprador'

export type CategoriaSegmento = 'produto' | 'servico' | 'equipamento' | 'transporte'

export type OrigemDocumento = 'fornecedor' | 'interno'

export type Exigencia = 'obrigatorio' | 'condicional'

export type ClassificacaoRisco = 'alto' | 'medio' | 'baixo'

export type StatusFornecedor = 'nao_homologado' | 'pendente' | 'homologado'

/** Estado de cada item do checklist (apresentação). */
export type EstadoItemChecklist = 'ok' | 'vencido' | 'faltando' | 'aguardando'

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
}

export interface Segmento {
  id: string
  nome: string
  categoria: CategoriaSegmento
  ativo: boolean
  created_at?: string
}

export interface TipoDocumento {
  id: string
  nome: string
  tem_validade: boolean
  origem: OrigemDocumento
  /** aceita vários arquivos vigentes ao mesmo tempo (laudos, certificações…) */
  permite_multiplos: boolean
  ativo: boolean
  created_at?: string
}

export interface SegmentoDocumento {
  id: string
  segmento_id: string
  tipo_documento_id: string
  exigencia: Exigencia
}

export interface Fornecedor {
  id: string
  razao_social: string
  cnpj: string
  telefone: string | null
  email: string | null
  classificacao_risco: ClassificacaoRisco | null
  status: StatusFornecedor
  data_cadastro: string
  created_at?: string
}

export interface Documento {
  id: string
  fornecedor_id: string
  tipo_documento_id: string
  arquivo_path: string
  data_envio: string
  data_vencimento: string | null
  is_atual: boolean
  enviado_por: string
  /** soft delete — preenchido quando o documento foi excluído */
  excluido_em?: string | null
  excluido_por?: string | null
  motivo_exclusao?: string | null
  created_at?: string
}

/** Um arquivo vigente dentro de um item do checklist. */
export interface ArquivoChecklist {
  id: string
  arquivo_path: string
  data_envio: string
  data_vencimento: string | null
}

/** Linha retornada pela RPC `get_checklist_fornecedor` (uma por tipo exigido). */
export interface ItemChecklist {
  tipo_documento_id: string
  nome: string
  exigencia: Exigencia
  tem_validade: boolean
  permite_multiplos: boolean
  estado: EstadoItemChecklist
  data_vencimento: string | null
  arquivo_path: string | null
  documento_id: string | null
  qtd_arquivos: number
  /** todos os arquivos vigentes deste tipo, mais recente primeiro */
  arquivos: ArquivoChecklist[]
}

/** Linha da RPC `get_checklist_geral` — checklist de todos os fornecedores. */
export interface ItemChecklistGeral {
  fornecedor_id: string
  fornecedor_nome: string
  status_fornecedor: StatusFornecedor
  tipo_documento_id: string
  documento_nome: string
  exigencia: Exigencia
  tem_validade: boolean
  estado: EstadoItemChecklist
  data_vencimento: string | null
}
