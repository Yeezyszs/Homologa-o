import { supabase } from './client'
import type {
  IFornecedoresRepo,
  FiltroFornecedores,
  DadosFornecedor,
} from '@/application/repositories'
import type { Fornecedor, Segmento, ItemChecklist } from '@/domain/entities'

const CAMPOS = 'id, razao_social, cnpj, telefone, email, classificacao_risco, status, data_cadastro, created_at'

export class FornecedoresRepoSupabase implements IFornecedoresRepo {
  async listar(filtro: FiltroFornecedores = {}): Promise<Fornecedor[]> {
    let query = supabase.from('fornecedores').select(CAMPOS)

    if (filtro.status) query = query.eq('status', filtro.status)
    if (filtro.busca) {
      const termo = `%${filtro.busca}%`
      query = query.or(`razao_social.ilike.${termo},cnpj.ilike.${termo}`)
    }
    if (filtro.segmentoId) {
      const { data: vinc, error: e1 } = await supabase
        .from('fornecedor_segmentos')
        .select('fornecedor_id')
        .eq('segmento_id', filtro.segmentoId)
      if (e1) throw e1
      const ids = (vinc ?? []).map((v) => v.fornecedor_id)
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }

    const { data, error } = await query.order('razao_social')
    if (error) throw error
    return (data ?? []) as Fornecedor[]
  }

  async obter(id: string): Promise<Fornecedor | null> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select(CAMPOS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Fornecedor) ?? null
  }

  async segmentosDo(fornecedorId: string): Promise<Segmento[]> {
    const { data, error } = await supabase
      .from('fornecedor_segmentos')
      .select('segmentos(*)')
      .eq('fornecedor_id', fornecedorId)
    if (error) throw error
    return (data ?? []).map((r: any) => r.segmentos as Segmento)
  }

  async criar(dados: DadosFornecedor): Promise<Fornecedor> {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        telefone: dados.telefone ?? null,
        email: dados.email ?? null,
        classificacao_risco: dados.classificacao_risco ?? null,
      })
      .select(CAMPOS)
      .single()
    if (error) throw error
    await this.sincronizarSegmentos(data.id, dados.segmentoIds)
    return data as Fornecedor
  }

  async atualizar(id: string, dados: DadosFornecedor): Promise<Fornecedor> {
    const { data, error } = await supabase
      .from('fornecedores')
      .update({
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        telefone: dados.telefone ?? null,
        email: dados.email ?? null,
        classificacao_risco: dados.classificacao_risco ?? null,
      })
      .eq('id', id)
      .select(CAMPOS)
      .single()
    if (error) throw error
    await this.sincronizarSegmentos(id, dados.segmentoIds)
    return data as Fornecedor
  }

  async checklist(fornecedorId: string): Promise<ItemChecklist[]> {
    const { data, error } = await supabase.rpc('get_checklist_fornecedor', {
      p_fornecedor_id: fornecedorId,
    })
    if (error) throw error
    return (data ?? []) as ItemChecklist[]
  }

  /** Substitui o conjunto de segmentos vinculados pelo informado. */
  private async sincronizarSegmentos(
    fornecedorId: string,
    segmentoIds: string[],
  ): Promise<void> {
    const { error: eDel } = await supabase
      .from('fornecedor_segmentos')
      .delete()
      .eq('fornecedor_id', fornecedorId)
    if (eDel) throw eDel

    if (segmentoIds.length === 0) return
    const linhas = segmentoIds.map((segmento_id) => ({
      fornecedor_id: fornecedorId,
      segmento_id,
    }))
    const { error: eIns } = await supabase
      .from('fornecedor_segmentos')
      .insert(linhas)
    if (eIns) throw eIns
    // Vincular segmentos muda o checklist obrigatório → recalcula status.
    await supabase.rpc('recalcular_status_fornecedor', {
      p_fornecedor_id: fornecedorId,
    })
  }
}
