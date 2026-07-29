import { supabase } from './client'
import type {
  IFornecedoresRepo,
  FiltroFornecedores,
  DadosFornecedor,
} from '@/application/repositories'
import type {
  Fornecedor,
  Segmento,
  ItemChecklist,
  ItemChecklistGeral,
  ArquivoChecklist,
} from '@/domain/entities'

const CAMPOS = 'id, razao_social, cnpj, telefone, email, classificacao_risco, status, data_cadastro, created_at'

/**
 * Adapta a linha da RPC ao tipo do domínio. Tolera o formato antigo (uma
 * versão por tipo, sem a coluna `arquivos`) para a UI não quebrar caso a
 * migration 0004 ainda não tenha sido aplicada no ambiente.
 */
function normalizarItem(linha: Record<string, unknown>): ItemChecklist {
  const arquivos = (linha.arquivos as ArquivoChecklist[] | undefined) ?? []
  const legado: ArquivoChecklist[] =
    arquivos.length === 0 && linha.documento_id
      ? [
          {
            id: linha.documento_id as string,
            arquivo_path: linha.arquivo_path as string,
            data_envio: '',
            data_vencimento: (linha.data_vencimento as string | null) ?? null,
          },
        ]
      : arquivos

  return {
    tipo_documento_id: linha.tipo_documento_id as string,
    nome: linha.nome as string,
    exigencia: linha.exigencia as ItemChecklist['exigencia'],
    tem_validade: Boolean(linha.tem_validade),
    permite_multiplos: Boolean(linha.permite_multiplos),
    estado: linha.estado as ItemChecklist['estado'],
    data_vencimento: (linha.data_vencimento as string | null) ?? null,
    arquivo_path: (linha.arquivo_path as string | null) ?? null,
    documento_id: (linha.documento_id as string | null) ?? null,
    qtd_arquivos: (linha.qtd_arquivos as number | undefined) ?? legado.length,
    arquivos: legado,
  }
}

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

  async mapaSegmentos(): Promise<Record<string, string[]>> {
    const { data, error } = await supabase
      .from('fornecedor_segmentos')
      .select('fornecedor_id, segmentos(nome)')
    if (error) throw error
    const mapa: Record<string, string[]> = {}
    for (const linha of (data ?? []) as any[]) {
      const nome = linha.segmentos?.nome
      if (!nome) continue
      ;(mapa[linha.fornecedor_id] ??= []).push(nome)
    }
    return mapa
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
    return ((data ?? []) as Record<string, unknown>[]).map(normalizarItem)
  }

  async checklistGeral(): Promise<ItemChecklistGeral[]> {
    const { data, error } = await supabase.rpc('get_checklist_geral')
    if (error) throw error
    return (data ?? []) as ItemChecklistGeral[]
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
