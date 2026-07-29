import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornecedoresRepo, catalogoRepo } from '@/infrastructure/repos'
import type { Fornecedor, Segmento, ItemChecklistGeral, StatusFornecedor } from '@/domain/entities'
import { statusMeta, formatarData, diasAte, corVencimento } from '@/ui/theme'
import { Card, Cabecalho, Carregando, Erro, Vazio, Pill } from '@/ui/components/ui'
import { Input, Select, Botao } from '@/ui/components/form'

function paraCSV(linhas: Fornecedor[]): string {
  const cab = ['Razao social', 'CNPJ', 'Telefone', 'E-mail', 'Risco', 'Status', 'Cadastro']
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const corpo = linhas.map((f) =>
    [
      f.razao_social,
      f.cnpj,
      f.telefone ?? '',
      f.email ?? '',
      f.classificacao_risco ?? '',
      statusMeta[f.status].label,
      f.data_cadastro,
    ]
      .map((c) => esc(String(c)))
      .join(','),
  )
  return [cab.map(esc).join(','), ...corpo].join('\n')
}

export function Consultas() {
  const navigate = useNavigate()
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [checklist, setChecklist] = useState<ItemChecklistGeral[]>([])
  const [vinculos, setVinculos] = useState<Record<string, string[]>>({})
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusFornecedor | ''>('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [l, segs, mapa] = await Promise.all([
          fornecedoresRepo.listar(),
          catalogoRepo.listarSegmentos(),
          fornecedoresRepo.mapaSegmentos(),
        ])
        let geral: ItemChecklistGeral[] = []
        try {
          geral = await fornecedoresRepo.checklistGeral()
        } catch {
          geral = []
        }
        if (!vivo) return
        setLista(l)
        setSegmentos(segs)
        setVinculos(mapa)
        setChecklist(geral)
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  /** Documentos vigentes que vencem nos próximos 6 meses, agrupados por mês. */
  const meses = useMemo(() => {
    const hoje = new Date()
    const base: { chave: string; rotulo: string; qtd: number }[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const rotulo =
        d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') +
        '/' +
        String(d.getFullYear()).slice(2)
      base.push({ chave, rotulo, qtd: 0 })
    }
    for (const i of checklist) {
      if (!i.data_vencimento) continue
      const chave = i.data_vencimento.slice(0, 7)
      const m = base.find((b) => b.chave === chave)
      if (m) m.qtd++
    }
    return base
  }, [checklist])

  const grafico = useMemo(() => {
    const max = Math.max(...meses.map((m) => m.qtd), 1)
    const largura = 660, topo = 20, base = 180
    const passo = (largura - 30) / Math.max(meses.length - 1, 1)
    const pontos = meses.map((m, i) => {
      const x = 30 + i * passo
      const y = topo + (base - topo) * (1 - m.qtd / max)
      return { x, y, ...m }
    })
    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area = `${linha} L${pontos[pontos.length - 1].x.toFixed(1)},${base} L${pontos[0].x.toFixed(1)},${base} Z`
    return { pontos, linha, area, base }
  }, [meses])

  /** Consolidado por segmento, cruzando os vínculos com o checklist geral. */
  const porSegmento = useMemo(() => {
    const vencidosPorFornecedor: Record<string, number> = {}
    for (const i of checklist) {
      if (i.estado === 'vencido')
        vencidosPorFornecedor[i.fornecedor_id] = (vencidosPorFornecedor[i.fornecedor_id] ?? 0) + 1
    }
    return segmentos
      .map((s) => {
        const doSeg = lista.filter((f) => (vinculos[f.id] ?? []).includes(s.nome))
        return {
          nome: s.nome,
          homologados: doSeg.filter((f) => f.status === 'homologado').length,
          pendentes: doSeg.filter((f) => f.status === 'pendente').length,
          vencidos: doSeg.reduce((acc, f) => acc + (vencidosPorFornecedor[f.id] ?? 0), 0),
          total: doSeg.length,
        }
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [segmentos, lista, checklist, vinculos])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lista.filter((f) => {
      if (status && f.status !== status) return false
      if (termo && !(f.razao_social.toLowerCase().includes(termo) || f.cnpj.includes(termo)))
        return false
      return true
    })
  }, [lista, busca, status])

  const proximoPorFornecedor = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const i of checklist) {
      if (!i.data_vencimento) continue
      if (!mapa[i.fornecedor_id] || i.data_vencimento < mapa[i.fornecedor_id])
        mapa[i.fornecedor_id] = i.data_vencimento
    }
    return mapa
  }, [checklist])

  function exportar() {
    const blob = new Blob(['﻿' + paraCSV(filtrados)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fornecedores-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (carregando) return <Carregando />

  return (
    <div>
      <Cabecalho titulo="Relatórios" subtitulo="Consolidado de homologação e vencimentos" />
      {erro && <Erro>{erro}</Erro>}

      <Card className="mb-4 px-[26px] py-[22px]">
        <h2 className="text-[15px] font-bold text-slate-900">Documentos vencendo por período</h2>
        <p className="mb-4 mt-1 text-[12.5px] text-slate-500">Próximos 6 meses, todos os segmentos</p>
        <svg viewBox="0 0 680 220" className="h-[220px] w-full overflow-visible">
          <line x1="30" y1={grafico.base} x2="660" y2={grafico.base} stroke="#e2e8f0" strokeWidth="1" />
          <path d={grafico.area} fill="#1F5B3F" opacity="0.08" />
          <path d={grafico.linha} fill="none" stroke="#1F5B3F" strokeWidth="2.5" />
          {grafico.pontos.map((p) => (
            <g key={p.chave}>
              <circle cx={p.x} cy={p.y} r="4" fill="#1F5B3F" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
                {p.qtd}
              </text>
              <text x={p.x} y="200" textAnchor="middle" fontSize="12" fill="#64748b">
                {p.rotulo}
              </text>
            </g>
          ))}
        </svg>
      </Card>

      {porSegmento.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="px-[22px] pb-1 pt-[18px]">
            <h2 className="text-[15px] font-bold text-slate-900">Status por segmento</h2>
          </div>
          <div className="th mt-2.5 grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b border-slate-200 px-[22px] py-3">
            <div>Segmento</div><div>Homologados</div><div>Pendentes</div><div>Docs vencidos</div><div>Total</div>
          </div>
          {porSegmento.map((r) => (
            <div
              key={r.nome}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center border-b border-slate-100 px-[22px] py-[13px] text-[13.5px] last:border-0"
            >
              <div className="truncate pr-2 font-semibold text-slate-900">{r.nome}</div>
              <div className="font-semibold text-[#047857]">{r.homologados}</div>
              <div className="font-semibold text-[#B45309]">{r.pendentes}</div>
              <div className="font-semibold text-[#B91C1C]">{r.vencidos}</div>
              <div className="text-slate-700">{r.total}</div>
            </div>
          ))}
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3.5 px-5 py-4">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CNPJ"
          className="mt-0 min-w-[220px] flex-1"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFornecedor | '')}
          className="mt-0 w-52"
        >
          <option value="">Todos os status</option>
          <option value="homologado">Homologado</option>
          <option value="pendente">Pendente</option>
          <option value="nao_homologado">Não homologado</option>
        </Select>
        <Botao variante="secundario" onClick={exportar} disabled={filtrados.length === 0}>
          Exportar CSV
        </Botao>
      </Card>

      <Card className="overflow-hidden">
        <div className="th grid grid-cols-[2.4fr_1fr_1.2fr_1.2fr] border-b border-slate-200 px-[22px] py-3.5">
          <div>Fornecedor</div><div>Status</div><div>Cadastro</div><div>Próximo vencimento</div>
        </div>
        {filtrados.length === 0 ? (
          <Vazio>Nenhum resultado.</Vazio>
        ) : (
          filtrados.map((f) => {
            const prox = proximoPorFornecedor[f.id]
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/fornecedores/${f.id}`)}
                className="grid cursor-pointer grid-cols-[2.4fr_1fr_1.2fr_1.2fr] items-center border-b border-slate-100 px-[22px] py-[15px] last:border-0 hover:bg-slate-50"
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate text-[13.5px] font-semibold text-slate-900">{f.razao_social}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{f.cnpj}</div>
                </div>
                <div><Pill cls={statusMeta[f.status].cls}>{statusMeta[f.status].label}</Pill></div>
                <div className="text-[13px] text-slate-600">{formatarData(f.data_cadastro)}</div>
                <div className={`text-[13px] font-semibold ${corVencimento(diasAte(prox ?? null))}`}>
                  {prox ? formatarData(prox) : <span className="text-slate-400">—</span>}
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
