import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fornecedoresRepo, documentosRepo } from '@/infrastructure/repos'
import type { Fornecedor, Segmento, ItemChecklist, Documento } from '@/domain/entities'
import {
  classesStatus,
  rotuloStatus,
  classesEstadoItem,
  rotuloEstadoItem,
} from '@/domain/checklist'
import { Badge } from '@/ui/components/Badge'
import { Modal } from '@/ui/components/Modal'
import { Campo, Input, Botao } from '@/ui/components/form'

export function FornecedorDetalhe() {
  const { id } = useParams()
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [checklist, setChecklist] = useState<ItemChecklist[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [upload, setUpload] = useState<ItemChecklist | null>(null)
  const [historico, setHistorico] = useState<ItemChecklist | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    try {
      const [f, segs, chk] = await Promise.all([
        fornecedoresRepo.obter(id),
        fornecedoresRepo.segmentosDo(id),
        fornecedoresRepo.checklist(id),
      ])
      setFornecedor(f)
      setSegmentos(segs)
      setChecklist(chk)
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { void carregar() }, [carregar])

  async function abrirArquivo(path: string) {
    try {
      const url = await documentosRepo.urlArquivo(path)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <p className="text-slate-500">Carregando…</p>
  if (erro) return <p className="text-red-600">Erro: {erro}</p>
  if (!fornecedor) return <p className="text-slate-500">Fornecedor não encontrado.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/fornecedores" className="text-sm text-slate-500 hover:underline">← Fornecedores</Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-800">{fornecedor.razao_social}</h1>
          <p className="text-sm text-slate-500">CNPJ {fornecedor.cnpj}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={classesStatus(fornecedor.status)}>{rotuloStatus[fornecedor.status]}</Badge>
          <Link to={`/fornecedores/${fornecedor.id}/editar`}>
            <Botao variante="secundario">Editar</Botao>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dado rotulo="Telefone" valor={fornecedor.telefone || '—'} />
        <Dado rotulo="E-mail" valor={fornecedor.email || '—'} />
        <Dado rotulo="Risco" valor={fornecedor.classificacao_risco ?? '—'} />
        <Dado rotulo="Cadastro" valor={fornecedor.data_cadastro} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Segmentos</h2>
        <div className="flex flex-wrap gap-2">
          {segmentos.length === 0
            ? <span className="text-sm text-slate-400">Nenhum segmento vinculado.</span>
            : segmentos.map((s) => <Badge key={s.id} className="bg-slate-100 text-slate-700 ring-slate-500/20">{s.nome}</Badge>)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Checklist de documentos</h2>
        {checklist.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            Nenhum documento exigido — vincule segmentos a este fornecedor.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Documento</th>
                  <th className="px-4 py-2 font-medium">Exigência</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checklist.map((item) => (
                  <tr key={item.tipo_documento_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{item.nome}</td>
                    <td className="px-4 py-2">
                      {item.exigencia === 'obrigatorio'
                        ? <span className="text-slate-700">Obrigatório</span>
                        : <span className="text-slate-400">Condicional</span>}
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={classesEstadoItem(item.estado)}>{rotuloEstadoItem[item.estado]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{item.data_vencimento ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {item.arquivo_path && (
                          <Botao variante="secundario" onClick={() => abrirArquivo(item.arquivo_path!)}>Ver</Botao>
                        )}
                        {item.documento_id && (
                          <Botao variante="secundario" onClick={() => setHistorico(item)}>Histórico</Botao>
                        )}
                        <Botao onClick={() => setUpload(item)}>
                          {item.documento_id ? 'Substituir' : 'Enviar'}
                        </Botao>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {upload && id && (
        <UploadModal
          fornecedorId={id}
          item={upload}
          onFechar={() => setUpload(null)}
          onEnviado={async () => { setUpload(null); await carregar() }}
        />
      )}

      {historico && id && (
        <HistoricoModal
          fornecedorId={id}
          item={historico}
          onFechar={() => setHistorico(null)}
          onAbrir={abrirArquivo}
        />
      )}
    </div>
  )
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{rotulo}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{valor}</div>
    </div>
  )
}

function UploadModal({
  fornecedorId,
  item,
  onFechar,
  onEnviado,
}: {
  fornecedorId: string
  item: ItemChecklist
  onFechar: () => void
  onEnviado: () => void
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [vencimento, setVencimento] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    setEnviando(true)
    setErro(null)
    try {
      await documentosRepo.enviarNovaVersao({
        fornecedorId,
        tipoDocumentoId: item.tipo_documento_id,
        arquivo,
        dataVencimento: item.tem_validade ? vencimento || null : null,
      })
      onEnviado()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`${item.documento_id ? 'Substituir' : 'Enviar'} — ${item.nome}`} aberto onFechar={onFechar}>
      <form onSubmit={enviar} className="space-y-4">
        {erro && <p className="text-red-600">Erro: {erro}</p>}
        <Campo label="Arquivo (PDF)">
          <Input type="file" accept="application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} required />
        </Campo>
        {item.tem_validade && (
          <Campo label="Data de vencimento">
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </Campo>
        )}
        {item.documento_id && (
          <p className="text-xs text-slate-500">A versão atual será arquivada no histórico (nada é apagado).</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={enviando || !arquivo}>{enviando ? 'Enviando…' : 'Enviar'}</Botao>
        </div>
      </form>
    </Modal>
  )
}

function HistoricoModal({
  fornecedorId,
  item,
  onFechar,
  onAbrir,
}: {
  fornecedorId: string
  item: ItemChecklist
  onFechar: () => void
  onAbrir: (path: string) => void
}) {
  const [versoes, setVersoes] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    documentosRepo
      .historico(fornecedorId, item.tipo_documento_id)
      .then((v) => vivo && setVersoes(v))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [fornecedorId, item.tipo_documento_id])

  return (
    <Modal titulo={`Histórico — ${item.nome}`} aberto onFechar={onFechar}>
      {carregando ? (
        <p className="text-slate-400">Carregando…</p>
      ) : versoes.length === 0 ? (
        <p className="text-slate-400">Nenhuma versão.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {versoes.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="text-slate-800">
                  Enviado em {v.data_envio}
                  {v.is_atual && <Badge className="ml-2 bg-green-100 text-green-800 ring-green-600/20">atual</Badge>}
                </div>
                {v.data_vencimento && <div className="text-xs text-slate-500">Vence em {v.data_vencimento}</div>}
              </div>
              <Botao variante="secundario" onClick={() => onAbrir(v.arquivo_path)}>Ver</Botao>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
