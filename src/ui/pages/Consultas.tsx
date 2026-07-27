import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fornecedoresRepo, catalogoRepo } from '@/infrastructure/repos'
import type { Fornecedor, Segmento, StatusFornecedor } from '@/domain/entities'
import { classesStatus, rotuloStatus } from '@/domain/checklist'
import { Badge } from '@/ui/components/Badge'
import { Select, Input, Botao } from '@/ui/components/form'

const STATUS: (StatusFornecedor | '')[] = ['', 'nao_homologado', 'pendente', 'homologado']

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
      rotuloStatus[f.status],
      f.data_cadastro,
    ]
      .map((c) => esc(String(c)))
      .join(','),
  )
  return [cab.map(esc).join(','), ...corpo].join('\n')
}

export function Consultas() {
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [busca, setBusca] = useState('')
  const [segmentoId, setSegmentoId] = useState('')
  const [status, setStatus] = useState<StatusFornecedor | ''>('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    catalogoRepo.listarSegmentos(true).then(setSegmentos).catch(() => {})
  }, [])

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    fornecedoresRepo
      .listar({ busca: busca || undefined, segmentoId: segmentoId || undefined, status: status || undefined })
      .then((l) => vivo && setLista(l))
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [busca, segmentoId, status])

  const resumo = useMemo(
    () => ({
      total: lista.length,
      homologado: lista.filter((f) => f.status === 'homologado').length,
      pendente: lista.filter((f) => f.status === 'pendente').length,
      nao_homologado: lista.filter((f) => f.status === 'nao_homologado').length,
    }),
    [lista],
  )

  function exportar() {
    const csv = paraCSV(lista)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fornecedores-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Consultas / Relatórios</h1>
        <Botao variante="secundario" onClick={exportar} disabled={lista.length === 0}>Exportar CSV</Botao>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} className="mt-0 w-64" />
        <Select value={segmentoId} onChange={(e) => setSegmentoId(e.target.value)} className="mt-0 w-56">
          <option value="">Todos os segmentos</option>
          {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFornecedor | '')} className="mt-0 w-48">
          {STATUS.map((s) => <option key={s} value={s}>{s === '' ? 'Todos os status' : rotuloStatus[s]}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile rotulo="Resultados" valor={resumo.total} />
        <Tile rotulo="Homologados" valor={resumo.homologado} cor="text-green-600" />
        <Tile rotulo="Pendentes" valor={resumo.pendente} cor="text-amber-600" />
        <Tile rotulo="Não homologados" valor={resumo.nao_homologado} cor="text-red-600" />
      </div>

      {erro && <p className="text-red-600">Erro: {erro}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fornecedor</th>
              <th className="px-4 py-2 font-medium">CNPJ</th>
              <th className="px-4 py-2 font-medium">Risco</th>
              <th className="px-4 py-2 font-medium">Cadastro</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum resultado.</td></tr>
            ) : (
              lista.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/fornecedores/${f.id}`} className="font-medium text-slate-800 hover:underline">{f.razao_social}</Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{f.cnpj}</td>
                  <td className="px-4 py-2 text-slate-600">{f.classificacao_risco ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{f.data_cadastro}</td>
                  <td className="px-4 py-2"><Badge className={classesStatus(f.status)}>{rotuloStatus[f.status]}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Tile({ rotulo, valor, cor = 'text-slate-800' }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{rotulo}</div>
      <div className={`mt-0.5 text-xl font-semibold ${cor}`}>{valor}</div>
    </div>
  )
}
