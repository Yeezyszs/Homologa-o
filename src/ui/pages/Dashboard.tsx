import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fornecedoresRepo } from '@/infrastructure/repos'
import type { Fornecedor } from '@/domain/entities'
import { classesStatus, rotuloStatus } from '@/domain/checklist'
import { Badge } from '@/ui/components/Badge'
import { supabase } from '@/infrastructure/supabase/client'

interface Indicadores {
  total: number
  homologados: number
  pendentes: number
  docsVencidos: number
}

export function Dashboard() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [ind, setInd] = useState<Indicadores>({
    total: 0,
    homologados: 0,
    pendentes: 0,
    docsVencidos: 0,
  })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const lista = await fornecedoresRepo.listar()
        // documentos vencidos (vigentes, com validade, vencidos)
        const { count, error } = await supabase
          .from('documentos')
          .select('id', { count: 'exact', head: true })
          .eq('is_atual', true)
          .not('data_vencimento', 'is', null)
          .lt('data_vencimento', new Date().toISOString().slice(0, 10))
        if (error) throw error
        if (!vivo) return
        setFornecedores(lista)
        setInd({
          total: lista.length,
          homologados: lista.filter((f) => f.status === 'homologado').length,
          pendentes: lista.filter((f) => f.status === 'pendente').length,
          docsVencidos: count ?? 0,
        })
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  if (carregando) return <p className="text-slate-500">Carregando…</p>
  if (erro) return <p className="text-red-600">Erro: {erro}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card titulo="Fornecedores" valor={ind.total} />
        <Card titulo="Homologados" valor={ind.homologados} cor="text-green-600" />
        <Card titulo="Pendentes" valor={ind.pendentes} cor="text-amber-600" />
        <Card titulo="Documentos vencidos" valor={ind.docsVencidos} cor="text-red-600" />
      </div>

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
            {fornecedores.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/fornecedores/${f.id}`} className="font-medium text-slate-800 hover:underline">
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
            ))}
            {fornecedores.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum fornecedor cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({
  titulo,
  valor,
  cor = 'text-slate-800',
}: {
  titulo: string
  valor: number
  cor?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className={`mt-1 text-2xl font-semibold ${cor}`}>{valor}</div>
    </div>
  )
}
