import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fornecedoresRepo } from '@/infrastructure/repos'
import type {
  Fornecedor,
  ItemChecklistGeral,
  StatusFornecedor,
  ClassificacaoRisco,
} from '@/domain/entities'
import { statusMeta, riscoMeta, riscoDe, diasAte, formatarData, corVencimento } from '@/ui/theme'
import { Pill, Dot, Card, Carregando, Erro, Cabecalho, Vazio } from '@/ui/components/ui'
import { Input } from '@/ui/components/form'

type FiltroStatus = StatusFornecedor | 'todos'
type FiltroRisco = ClassificacaoRisco | 'todos'

const STATUS: { key: FiltroStatus; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'homologado', label: 'Homologado' },
  { key: 'pendente', label: 'Pendente' },
  { key: 'nao_homologado', label: 'Não homologado' },
]

const RISCOS: { key: FiltroRisco; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'baixo', label: 'Baixo' },
  { key: 'medio', label: 'Médio' },
  { key: 'alto', label: 'Alto' },
]

export function Fornecedores() {
  const navigate = useNavigate()
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [checklist, setChecklist] = useState<ItemChecklistGeral[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [risco, setRisco] = useState<FiltroRisco>('todos')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const l = await fornecedoresRepo.listar()
        let geral: ItemChecklistGeral[] = []
        try {
          geral = await fornecedoresRepo.checklistGeral()
        } catch {
          geral = []
        }
        if (!vivo) return
        setLista(l)
        setChecklist(geral)
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  /** Próximo vencimento e segmentos por fornecedor, derivados do checklist geral. */
  const resumo = useMemo(() => {
    const mapa: Record<string, { proximo: string | null; vencido: boolean }> = {}
    for (const i of checklist) {
      if (!i.data_vencimento) continue
      const atual = mapa[i.fornecedor_id] ?? { proximo: null, vencido: false }
      if (i.estado === 'vencido') atual.vencido = true
      if (!atual.proximo || i.data_vencimento < atual.proximo) atual.proximo = i.data_vencimento
      mapa[i.fornecedor_id] = atual
    }
    return mapa
  }, [checklist])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lista.filter((f) => {
      if (status !== 'todos' && f.status !== status) return false
      if (risco !== 'todos' && f.classificacao_risco !== risco) return false
      if (termo && !(f.razao_social.toLowerCase().includes(termo) || f.cnpj.includes(termo)))
        return false
      return true
    })
  }, [lista, busca, status, risco])

  return (
    <div>
      <Cabecalho
        titulo="Fornecedores"
        subtitulo={`${filtrados.length} de ${lista.length} fornecedores`}
        acao={
          <Link
            to="/fornecedores/novo"
            className="rounded-lg bg-marca px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-marca-escuro"
          >
            + Novo fornecedor
          </Link>
        }
      />

      {erro && <Erro>{erro}</Erro>}

      <Card className="mb-4 flex flex-wrap items-center gap-3.5 px-5 py-4">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CNPJ"
          className="mt-0 min-w-[220px] flex-1"
        />
        <div className="flex gap-1.5">
          {STATUS.map((s) => {
            const ativo = status === s.key
            const meta = s.key === 'todos' ? null : statusMeta[s.key]
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={`rounded-full border px-3 py-[7px] text-[12.5px] font-semibold transition-colors ${
                  ativo
                    ? meta
                      ? meta.cls
                      : 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-1.5">
          {RISCOS.map((r) => {
            const ativo = risco === r.key
            const meta = r.key === 'todos' ? null : riscoMeta[r.key]
            return (
              <button
                key={r.key}
                onClick={() => setRisco(r.key)}
                className={`rounded-full border px-3 py-[7px] text-[12.5px] font-semibold transition-colors ${
                  ativo
                    ? meta
                      ? meta.cls
                      : 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="th grid grid-cols-[2.4fr_1fr_1fr_1.3fr] border-b border-slate-200 px-[22px] py-3.5">
          <div>Fornecedor</div>
          <div>Status</div>
          <div>Risco</div>
          <div>Próximo vencimento</div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando…" />
        ) : filtrados.length === 0 ? (
          <Vazio>Nenhum fornecedor encontrado com esses filtros.</Vazio>
        ) : (
          filtrados.map((f) => {
            const r = riscoDe(f.classificacao_risco)
            const info = resumo[f.id]
            const dias = diasAte(info?.proximo ?? null)
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/fornecedores/${f.id}`)}
                className="grid cursor-pointer grid-cols-[2.4fr_1fr_1fr_1.3fr] items-center border-b border-slate-100 px-[22px] py-[15px] last:border-0 hover:bg-slate-50"
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate text-[13.5px] font-semibold text-slate-900">
                    {f.razao_social}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{f.cnpj}</div>
                </div>
                <div>
                  <Pill cls={statusMeta[f.status].cls}>{statusMeta[f.status].label}</Pill>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-700">
                  {r ? (<><Dot cor={r.cor} />{r.label}</>) : <span className="text-slate-400">—</span>}
                </div>
                <div className={`text-[13px] font-semibold ${corVencimento(dias)}`}>
                  {info?.proximo ? formatarData(info.proximo) : <span className="text-slate-400">—</span>}
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
