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
  created_at?: string
}

/** Linha retornada pela RPC `get_checklist_fornecedor`. */
export interface ItemChecklist {
  tipo_documento_id: string
  nome: string
  exigencia: Exigencia
  tem_validade: boolean
  estado: EstadoItemChecklist
  data_vencimento: string | null
  arquivo_path: string | null
  documento_id: string | null
}
