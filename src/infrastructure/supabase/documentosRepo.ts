import { supabase } from './client'
import type {
  IDocumentosRepo,
  NovaVersaoDocumento,
} from '@/application/repositories'
import type { Documento } from '@/domain/entities'
import { montarPathDocumento, subirArquivo, urlAssinada } from './storage'

export class DocumentosRepoSupabase implements IDocumentosRepo {
  async historico(
    fornecedorId: string,
    tipoDocumentoId: string,
  ): Promise<Documento[]> {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('fornecedor_id', fornecedorId)
      .eq('tipo_documento_id', tipoDocumentoId)
      .order('data_envio', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Documento[]
  }

  async enviarNovaVersao(entrada: NovaVersaoDocumento): Promise<Documento> {
    const { fornecedorId, tipoDocumentoId, arquivo, dataVencimento } = entrada

    const path = montarPathDocumento(fornecedorId, tipoDocumentoId, arquivo.name)
    await subirArquivo(path, arquivo)

    const { data: userData } = await supabase.auth.getUser()
    const enviadoPor = userData.user?.id

    // Aposenta a versão vigente anterior (mantém histórico).
    const { error: eUpd } = await supabase
      .from('documentos')
      .update({ is_atual: false })
      .eq('fornecedor_id', fornecedorId)
      .eq('tipo_documento_id', tipoDocumentoId)
      .eq('is_atual', true)
    if (eUpd) throw eUpd

    const { data, error } = await supabase
      .from('documentos')
      .insert({
        fornecedor_id: fornecedorId,
        tipo_documento_id: tipoDocumentoId,
        arquivo_path: path,
        data_vencimento: dataVencimento ?? null,
        is_atual: true,
        enviado_por: enviadoPor,
      })
      .select('*')
      .single()
    if (error) throw error
    // O trigger em `documentos` recalcula o status do fornecedor.
    return data as Documento
  }

  async urlArquivo(arquivoPath: string): Promise<string> {
    return urlAssinada(arquivoPath)
  }
}
