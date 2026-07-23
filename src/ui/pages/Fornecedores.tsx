import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fornecedoresRepo, catalogoRepo } from '@/infrastructure/repos'
import type { Fornecedor, Segmento, StatusFornecedor } from '@/domain/entities'
import { classesStatus, rotuloStatus } from '@/domain/checklist'
import { Badge } from '@/ui/components/Badge'

const STATUS: (StatusFornecedor | '')[] = ['', 'nao_homologado', 'pendente', 'homologado']

export function Fornecedores() {
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
      .listar({
        busca: busca || undefined,
        segmentoId: segmentoId || undefined,
        status: status || undefined,
      })
      .then((l) => vivo && setLista(l))
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setCarregando(false))
    return () => {
      vivo = false
    }
  }, [busca, segmentoId, status])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Fornecedores</h1>
        <Link
          to="/fornecedores/novo"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo fornecedor
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nome ou CNPJ"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
        <select
          value={segmentoId}
          onChange={(e) => setSegmentoId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos os segmentos</option>
          {segmentos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFornecedor | '')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'Todos os status' : rotuloStatus[s]}
            </option>
          ))}
        </select>
      </div>

      {erro && <p className="text-red-600">Erro: {erro}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fornecedor</th>
              <th className="px-4 py-2 font-medium">CNPJ</th>
              <th className="px-4 py-2 font-medium">Risco</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Carregando…
                </td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            ) : (
              lista.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/fornecedores/${f.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {f.razao_social}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{f.cnpj}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {f.classificacao_risco ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={classesStatus(f.status)}>
                      {rotuloStatus[f.status]}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
