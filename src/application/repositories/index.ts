// Interfaces dos repositórios. A UI depende SÓ destas abstrações;
// a implementação concreta (Supabase) vive em infrastructure/.

import type {
  Fornecedor,
  Segmento,
  TipoDocumento,
  SegmentoDocumento,
  Documento,
  ItemChecklist,
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
  criar(dados: DadosFornecedor): Promise<Fornecedor>
  atualizar(id: string, dados: DadosFornecedor): Promise<Fornecedor>
  /** Checklist resolvido pela RPC do Postgres (a UI só consome). */
  checklist(fornecedorId: string): Promise<ItemChecklist[]>
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
