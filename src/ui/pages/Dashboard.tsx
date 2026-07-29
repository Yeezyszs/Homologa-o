import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fornecedoresRepo, catalogoRepo } from '@/infrastructure/repos'
import type { Fornecedor, Segmento, ItemChecklistGeral } from '@/domain/entities'
import { statusMeta, riscoDe, diasAte } from '@/ui/theme'
import { Pill, Dot, Kpi, Card, TituloCard, Carregando, Erro, Cabecalho } from '@/ui/components/ui'
import { Botao } from '@/ui/components/form'

const JANELA_DIAS = 30

interface ItemAtencao {
  chave: string
  fornecedorId: string
  fornecedorNome: string
  documento: string
  rotulo: string
  cor: string
  urgencia: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [checklist, setChecklist] = useState<ItemChecklistGeral[]>([])
  const [vinculos, setVinculos] = useState<Record<string, string[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  /** o checklist não pôde ser lido — não dá para afirmar que está tudo em dia */
  const [checklistIndisponivel, setChecklistIndisponivel] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [lista, segs] = await Promise.all([
          fornecedoresRepo.listar(),
          catalogoRepo.listarSegmentos(),
        ])
        // Se o checklist falhar, sinalizamos: um painel de compliance não pode
        // dizer "tudo em dia" quando na verdade não conseguiu consultar.
        let geral: ItemChecklistGeral[] = []
        try {
          geral = await fornecedoresRepo.checklistGeral()
        } catch {
          if (vivo) setChecklistIndisponivel(true)
        }
        const porFornecedor = await fornecedoresRepo.mapaSegmentos()
        if (!vivo) return
        setFornecedores(lista)
        setSegmentos(segs)
        setChecklist(geral)
        setVinculos(porFornecedor)
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  const kpis = useMemo(() => {
    const vencidos = checklist.filter((i) => i.estado === 'vencido').length
    return {
      total: fornecedores.length,
      homologados: fornecedores.filter((f) => f.status === 'homologado').length,
      pendentes: fornecedores.filter((f) => f.status === 'pendente').length,
      docsVencidos: vencidos,
    }
  }, [fornecedores, checklist])

  const atencao = useMemo<ItemAtencao[]>(() => {
    const itens: ItemAtencao[] = []
    for (const i of checklist) {
      const chave = i.fornecedor_id + i.tipo_documento_id
      const dias = diasAte(i.data_vencimento)
      if (i.estado === 'vencido') {
        itens.push({
          chave,
          fornecedorId: i.fornecedor_id,
          fornecedorNome: i.fornecedor_nome,
          documento: i.documento_nome,
          rotulo: dias !== null ? `Vencido há ${Math.abs(dias)} dias` : 'Vencido',
          cor: statusMeta.nao_homologado.cor,
          urgencia: dias !== null ? -1000 + dias : -2000,
        })
      } else if (i.estado === 'ok' && dias !== null && dias <= JANELA_DIAS) {
        itens.push({
          chave,
          fornecedorId: i.fornecedor_id,
          fornecedorNome: i.fornecedor_nome,
          documento: i.documento_nome,
          rotulo: `Vence em ${dias} dias`,
          cor: statusMeta.pendente.cor,
          urgencia: dias,
        })
      } else if (i.estado === 'faltando' && i.exigencia === 'obrigatorio') {
        itens.push({
          chave,
          fornecedorId: i.fornecedor_id,
          fornecedorNome: i.fornecedor_nome,
          documento: i.documento_nome,
          rotulo: 'Pendente de envio',
          cor: statusMeta.pendente.cor,
          urgencia: 500,
        })
      }
    }
    return itens.sort((a, b) => a.urgencia - b.urgencia)
  }, [checklist])

  const barras = useMemo(() => {
    const contagem = segmentos.map((s) => ({
      nome: s.nome,
      qtd: Object.values(vinculos).filter((ns) => ns.includes(s.nome)).length,
    }))
    const max = Math.max(...contagem.map((c) => c.qtd), 1)
    return contagem
      .filter((c) => c.qtd > 0)
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8)
      .map((c) => ({ ...c, pct: Math.round((c.qtd / max) * 100) }))
  }, [segmentos, vinculos])

  if (carregando) return <Carregando />

  const recentes = [...fornecedores]
    .sort((a, b) => (b.data_cadastro > a.data_cadastro ? 1 : -1))
    .slice(0, 6)

  return (
    <div>
      <Cabecalho titulo="Dashboard" subtitulo="Visão geral da homologação de fornecedores" />
      {erro && <Erro>{erro}</Erro>}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi rotulo="Fornecedores" valor={kpis.total} />
        <Kpi rotulo="Homologados" valor={kpis.homologados} cor="text-[#047857]" />
        <Kpi rotulo="Pendentes" valor={kpis.pendentes} cor="text-[#B45309]" />
        <Kpi
          rotulo="Documentos vencidos"
          valor={checklistIndisponivel ? '—' : kpis.docsVencidos}
          cor="text-[#B91C1C]"
        />
      </div>

      <Card className="mb-5 px-[22px] py-5">
        <TituloCard
          extra={
            <span className="text-[12.5px] text-slate-500">
              {checklistIndisponivel
                ? 'não foi possível verificar'
                : atencao.length === 1
                  ? '1 item precisa de atenção'
                  : `${atencao.length} itens precisam de atenção`}
            </span>
          }
        >
          Ação necessária
        </TituloCard>
        {checklistIndisponivel ? (
          <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#B45309]">
            Não foi possível consultar os documentos agora, então esta lista pode estar
            incompleta. <strong className="font-semibold">Não considere como "tudo em dia".</strong>{' '}
            Recarregue a página para tentar de novo.
          </div>
        ) : atencao.length === 0 ? (
          <div className="py-[18px] text-[13.5px] text-slate-500">
            Nenhum item pendente no momento — tudo em dia.
          </div>
        ) : (
          <div className="flex flex-col">
            {atencao.slice(0, 8).map((it) => (
              <div
                key={it.chave}
                className="flex items-center justify-between gap-4 border-b border-slate-100 py-[11px] last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Dot cor={it.cor} />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-slate-900">
                      {it.fornecedorNome}
                    </div>
                    <div className="truncate text-[12.5px] text-slate-500">{it.documento}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3.5">
                  <span className="text-[12.5px] font-semibold" style={{ color: it.cor }}>
                    {it.rotulo}
                  </span>
                  <Botao variante="secundario" onClick={() => navigate(`/fornecedores/${it.fornecedorId}`)}>
                    Ver
                  </Botao>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="px-[22px] py-5 lg:col-span-2">
          <TituloCard
            extra={
              <Link to="/fornecedores" className="text-[12.5px] font-semibold text-marca hover:underline">
                Ver todos →
              </Link>
            }
          >
            Fornecedores recentes
          </TituloCard>
          <div className="th grid grid-cols-[2.2fr_1.2fr_1fr_1fr] border-b border-slate-200 pb-2">
            <div>Fornecedor</div>
            <div>Segmento</div>
            <div>Status</div>
            <div>Risco</div>
          </div>
          {recentes.length === 0 ? (
            <div className="py-8 text-center text-[13.5px] text-slate-400">
              Nenhum fornecedor cadastrado ainda.
            </div>
          ) : (
            recentes.map((f) => {
              const risco = riscoDe(f.classificacao_risco)
              const segs = vinculos[f.id] ?? []
              return (
                <div
                  key={f.id}
                  onClick={() => navigate(`/fornecedores/${f.id}`)}
                  className="grid cursor-pointer grid-cols-[2.2fr_1.2fr_1fr_1fr] items-center border-b border-slate-100 py-[13px] hover:bg-slate-50"
                >
                  <div className="truncate pr-2 text-[13.5px] font-semibold text-slate-900">
                    {f.razao_social}
                  </div>
                  <div className="truncate pr-2 text-[13px] text-slate-500">
                    {segs.length === 0 ? '—' : segs.length === 1 ? segs[0] : `${segs[0]} +${segs.length - 1}`}
                  </div>
                  <div>
                    <Pill cls={statusMeta[f.status].cls}>{statusMeta[f.status].label}</Pill>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                    {risco ? (<><Dot cor={risco.cor} />{risco.label}</>) : <span className="text-slate-400">—</span>}
                  </div>
                </div>
              )
            })
          )}
        </Card>

        <Card className="px-[22px] py-5">
          <TituloCard>Por segmento</TituloCard>
          {barras.length === 0 ? (
            <p className="text-[13px] text-slate-400">Sem fornecedores vinculados a segmentos.</p>
          ) : (
            barras.map((b) => (
              <div key={b.nome} className="mb-3">
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="truncate pr-2 font-semibold text-slate-700">{b.nome}</span>
                  <span className="text-slate-500">{b.qtd}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-marca" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
