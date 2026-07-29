// Interfaces dos repositórios. A UI depende SÓ destas abstrações;
// a implementação concreta (Supabase) vive em infrastructure/.

import type {
  Fornecedor,
  Segmento,
  TipoDocumento,
  SegmentoDocumento,
  Documento,
  ItemChecklist,
  ItemChecklistGeral,
  ClassificacaoRisco,
  CategoriaSegmento,
  Exigencia,
  OrigemDocumento,
} from '@/domain/entities'

export interface FiltroFornecedores {
  busca?: string // nome ou CNPJ
  segmentoId?: string
  status?: Fornecedor['status']
}

export interface DadosFornecedor {
  razao_social: string
  cnpj: string
  telefone?: string | null
  email?: string | null
  classificacao_risco?: ClassificacaoRisco | null
  segmentoIds: string[]
}

export interface IFornecedoresRepo {
  listar(filtro?: FiltroFornecedores): Promise<Fornecedor[]>
  obter(id: string): Promise<Fornecedor | null>
  segmentosDo(fornecedorId: string): Promise<Segmento[]>
  /** Nomes dos segmentos de todos os fornecedores, em uma única consulta. */
  mapaSegmentos(): Promise<Record<string, string[]>>
  criar(dados: DadosFornecedor): Promise<Fornecedor>
  atualizar(id: string, dados: DadosFornecedor): Promise<Fornecedor>
  /** Checklist resolvido pela RPC do Postgres (a UI só consome). */
  checklist(fornecedorId: string): Promise<ItemChecklist[]>
  /**
   * Checklist consolidado de todos os fornecedores — alimenta dashboard
   * e relatórios com uma única consulta.
   */
  checklistGeral(): Promise<ItemChecklistGeral[]>
}

export interface NovaVersaoDocumento {
  fornecedorId: string
  tipoDocumentoId: string
  arquivo: File
  dataVencimento?: string | null
}

export interface IDocumentosRepo {
  /** Versões (histórico) de um tipo para um fornecedor, mais recente primeiro. */
  historico(fornecedorId: string, tipoDocumentoId: string): Promise<Documento[]>
  /** Sobe o arquivo, versiona (is_atual) e grava a nova versão. */
  enviarNovaVersao(entrada: NovaVersaoDocumento): Promise<Documento>
  /** URL assinada para baixar/visualizar um arquivo do Storage. */
  urlArquivo(arquivoPath: string): Promise<string>
  /**
   * Exclusão de um documento lançado errado (soft delete): sai da tela e do
   * cálculo de status, mas o registro fica no banco com autor e motivo.
   * O motivo é obrigatório — é ele que sustenta a auditoria.
   */
  excluir(documentoId: string, motivo: string): Promise<void>
}

export interface DadosSegmento {
  nome: string
  categoria: CategoriaSegmento
  ativo?: boolean
}

export interface DadosTipoDocumento {
  nome: string
  tem_validade: boolean
  origem: OrigemDocumento
  /** aceita vários arquivos vigentes ao mesmo tempo */
  permite_multiplos: boolean
  ativo?: boolean
}

export interface ItemChecklistSegmento {
  tipo_documento_id: string
  exigencia: Exigencia
}

export interface ICatalogoRepo {
  // segmentos
  listarSegmentos(apenasAtivos?: boolean): Promise<Segmento[]>
  criarSegmento(dados: DadosSegmento): Promise<Segmento>
  atualizarSegmento(id: string, dados: DadosSegmento): Promise<Segmento>
  // tipos de documento
  listarTiposDocumento(apenasAtivos?: boolean): Promise<TipoDocumento[]>
  criarTipoDocumento(dados: DadosTipoDocumento): Promise<TipoDocumento>
  atualizarTipoDocumento(id: string, dados: DadosTipoDocumento): Promise<TipoDocumento>
  // checklist do segmento (segmento_documentos)
  documentosDoSegmento(segmentoId: string): Promise<SegmentoDocumento[]>
  definirChecklistSegmento(
    segmentoId: string,
    itens: ItemChecklistSegmento[],
  ): Promise<void>
}
