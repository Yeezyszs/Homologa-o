import { supabase, BUCKET_DOCUMENTOS } from './client'

/** Monta um path determinístico e único para a versão de um documento. */
export function montarPathDocumento(
  fornecedorId: string,
  tipoDocumentoId: string,
  nomeArquivo: string,
): string {
  const carimbo = Date.now()
  const seguro = nomeArquivo.replace(/[^\w.\-]+/g, '_')
  return `${fornecedorId}/${tipoDocumentoId}/${carimbo}-${seguro}`
}

export async function subirArquivo(path: string, arquivo: File): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, arquivo, {
      cacheControl: '3600',
      upsert: false,
      contentType: arquivo.type || 'application/pdf',
    })
  if (error) throw error
}

export async function urlAssinada(path: string, segundos = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, segundos)
  if (error) throw error
  return data.signedUrl
}
