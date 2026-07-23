import { supabase } from './client'
import type {
  ICatalogoRepo,
  DadosSegmento,
  DadosTipoDocumento,
  ItemChecklistSegmento,
} from '@/application/repositories'
import type {
  Segmento,
  TipoDocumento,
  SegmentoDocumento,
} from '@/domain/entities'

export class CatalogoRepoSupabase implements ICatalogoRepo {
  async listarSegmentos(apenasAtivos = false): Promise<Segmento[]> {
    let q = supabase.from('segmentos').select('*').order('nome')
    if (apenasAtivos) q = q.eq('ativo', true)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as Segmento[]
  }

  async criarSegmento(dados: DadosSegmento): Promise<Segmento> {
    const { data, error } = await supabase
      .from('segmentos')
      .insert({ ...dados, ativo: dados.ativo ?? true })
      .select('*')
      .single()
    if (error) throw error
    return data as Segmento
  }

  async atualizarSegmento(id: string, dados: DadosSegmento): Promise<Segmento> {
    const { data, error } = await supabase
      .from('segmentos')
      .update({ ...dados })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Segmento
  }

  async listarTiposDocumento(apenasAtivos = false): Promise<TipoDocumento[]> {
    let q = supabase.from('tipos_documento').select('*').order('nome')
    if (apenasAtivos) q = q.eq('ativo', true)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as TipoDocumento[]
  }

  async criarTipoDocumento(dados: DadosTipoDocumento): Promise<TipoDocumento> {
    const { data, error } = await supabase
      .from('tipos_documento')
      .insert({ ...dados, ativo: dados.ativo ?? true })
      .select('*')
      .single()
    if (error) throw error
    return data as TipoDocumento
  }

  async atualizarTipoDocumento(
    id: string,
    dados: DadosTipoDocumento,
  ): Promise<TipoDocumento> {
    const { data, error } = await supabase
      .from('tipos_documento')
      .update({ ...dados })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as TipoDocumento
  }

  async documentosDoSegmento(segmentoId: string): Promise<SegmentoDocumento[]> {
    const { data, error } = await supabase
      .from('segmento_documentos')
      .select('*')
      .eq('segmento_id', segmentoId)
    if (error) throw error
    return (data ?? []) as SegmentoDocumento[]
  }

  /** Regrava o checklist do segmento por completo (delete + insert). */
  async definirChecklistSegmento(
    segmentoId: string,
    itens: ItemChecklistSegmento[],
  ): Promise<void> {
    const { error: eDel } = await supabase
      .from('segmento_documentos')
      .delete()
      .eq('segmento_id', segmentoId)
    if (eDel) throw eDel

    if (itens.length === 0) return
    const linhas = itens.map((i) => ({
      segmento_id: segmentoId,
      tipo_documento_id: i.tipo_documento_id,
      exigencia: i.exigencia,
    }))
    const { error: eIns } = await supabase
      .from('segmento_documentos')
      .insert(linhas)
    if (eIns) throw eIns
  }
}
