import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fornecedoresRepo, documentosRepo } from '@/infrastructure/repos'
import type {
  Fornecedor,
  Segmento,
  ItemChecklist,
  ArquivoChecklist,
  Documento,
} from '@/domain/entities'
import { statusMeta, estadoMeta, riscoDe, formatarData, diasAte, corVencimento } from '@/ui/theme'
import { Pill, Dot, Card, Carregando, Erro } from '@/ui/components/ui'
import { Modal } from '@/ui/components/Modal'
import { Campo, Input, Textarea, Botao } from '@/ui/components/form'

export function FornecedorDetalhe() {
  const { id } = useParams()
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [checklist, setChecklist] = useState<ItemChecklist[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [uploadDe, setUploadDe] = useState<string | null>(null)
  const [historicoDe, setHistoricoDe] = useState<ItemChecklist | null>(null)
  const [excluindo, setExcluindo] = useState<{ item: ItemChecklist; arquivo: ArquivoChecklist } | null>(null)

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
      window.open(await documentosRepo.urlArquivo(path), '_blank', 'noopener')
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) return <Carregando />
  if (!fornecedor) return <Erro>{erro ?? 'Fornecedor não encontrado.'}</Erro>

  const risco = riscoDe(fornecedor.classificacao_risco)
  const meta = statusMeta[fornecedor.status]

  return (
    <div>
      <div className="mb-4">
        <Link to="/fornecedores" className="text-[13px] font-semibold text-slate-500 hover:text-marca">
          ← Fornecedores
        </Link>
      </div>

      {erro && <Erro>{erro}</Erro>}

      <Card className="mb-4 flex flex-wrap items-start justify-between gap-4 px-[26px] py-6">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-[21px] font-bold text-slate-900">{fornecedor.razao_social}</h1>
            <Pill cls={meta.cls}>{meta.label}</Pill>
          </div>
          <div className="text-[13.5px] text-slate-500">
            {fornecedor.cnpj}
            {segmentos.length > 0 && ` · ${segmentos.map((s) => s.nome).join(', ')}`}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-700">
            {risco ? (<><Dot cor={risco.cor} />Risco {risco.label}</>) : <span className="text-slate-400">Risco não informado</span>}
            <span className="mx-1 text-slate-300">•</span>
            <span className="text-slate-500">Cadastrado em {formatarData(fornecedor.data_cadastro)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-4">
          <div className="text-right text-[13px] text-slate-700">
            {fornecedor.telefone && <div className="text-slate-500">{fornecedor.telefone}</div>}
            {fornecedor.email && <div className="text-slate-500">{fornecedor.email}</div>}
          </div>
          <Link to={`/fornecedores/${fornecedor.id}/editar`}>
            <Botao variante="secundario">Editar</Botao>
          </Link>
        </div>
      </Card>

      <Card className="px-[26px] py-[22px]">
        <h2 className="mb-4 text-[15px] font-bold text-slate-900">Documentos exigidos</h2>

        {checklist.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-[13.5px] text-slate-400">
            Nenhum documento exigido — vincule segmentos a este fornecedor.
          </div>
        ) : (
          checklist.map((item) => (
            <LinhaDocumento
              key={item.tipo_documento_id}
              item={item}
              aberto={uploadDe === item.tipo_documento_id}
              onToggleUpload={() =>
                setUploadDe((v) => (v === item.tipo_documento_id ? null : item.tipo_documento_id))
              }
              onHistorico={() => setHistoricoDe(item)}
              onVer={abrirArquivo}
              onExcluir={(arquivo) => setExcluindo({ item, arquivo })}
              fornecedorId={fornecedor.id}
              onEnviado={async () => { setUploadDe(null); await carregar() }}
              onErro={setErro}
            />
          ))
        )}
      </Card>

      {historicoDe && fornecedor && (
        <HistoricoModal
          fornecedorId={fornecedor.id}
          item={historicoDe}
          onFechar={() => setHistoricoDe(null)}
          onVer={abrirArquivo}
        />
      )}

      {excluindo && (
        <ExcluirModal
          item={excluindo.item}
          arquivo={excluindo.arquivo}
          onFechar={() => setExcluindo(null)}
          onExcluido={async () => { setExcluindo(null); await carregar() }}
        />
      )}
    </div>
  )
}

function LinhaDocumento({
  item,
  aberto,
  fornecedorId,
  onToggleUpload,
  onHistorico,
  onVer,
  onExcluir,
  onEnviado,
  onErro,
}: {
  item: ItemChecklist
  aberto: boolean
  fornecedorId: string
  onToggleUpload: () => void
  onHistorico: () => void
  onVer: (path: string) => void
  onExcluir: (a: ArquivoChecklist) => void
  onEnviado: () => void
  onErro: (m: string) => void
}) {
  const meta = estadoMeta[item.estado]
  const acao = item.permite_multiplos
    ? '+ Adicionar arquivo'
    : item.qtd_arquivos > 0
      ? 'Substituir'
      : 'Enviar'

  const legenda = item.permite_multiplos
    ? item.qtd_arquivos === 0
      ? 'Nenhum arquivo enviado · aceita vários'
      : `${item.qtd_arquivos} arquivo(s) vigente(s) · aceita vários`
    : item.qtd_arquivos === 0
      ? 'Nenhum arquivo enviado'
      : item.data_vencimento
        ? `Válido até ${formatarData(item.data_vencimento)}`
        : 'Enviado · sem data de validade'

  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {item.nome}
            {item.exigencia === 'condicional' && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                condicional
              </span>
            )}
          </div>
          <div className="mt-1 text-[12.5px] text-slate-500">{legenda}</div>
        </div>
        <Pill cls={meta.cls}>{meta.label}</Pill>
        <div className="flex shrink-0 gap-2">
          {item.qtd_arquivos > 0 && (
            <Botao variante="secundario" onClick={onHistorico}>Histórico</Botao>
          )}
          <Botao variante="suave" onClick={onToggleUpload}>{aberto ? 'Cancelar' : acao}</Botao>
        </div>
      </div>

      {item.arquivos.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {item.arquivos.map((a) => {
            const dias = diasAte(a.data_vencimento)
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5 last:border-0"
              >
                <div className="min-w-0 text-[12.5px] text-slate-700">
                  <span className="font-medium">{nomeArquivo(a.arquivo_path)}</span>
                  {a.data_envio && (
                    <span className="text-slate-400"> · enviado em {formatarData(a.data_envio)}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.tem_validade && (
                    <span className={`text-[12.5px] font-semibold ${corVencimento(dias)}`}>
                      {a.data_vencimento ? `vence ${formatarData(a.data_vencimento)}` : 'sem validade'}
                    </span>
                  )}
                  <Botao variante="secundario" onClick={() => onVer(a.arquivo_path)}>Ver</Botao>
                  <Botao variante="perigo" onClick={() => onExcluir(a)}>Excluir</Botao>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {aberto && (
        <Dropzone
          item={item}
          fornecedorId={fornecedorId}
          onEnviado={onEnviado}
          onErro={onErro}
        />
      )}
    </div>
  )
}

function nomeArquivo(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/^\d+-/, '')
}

function Dropzone({
  item,
  fornecedorId,
  onEnviado,
  onErro,
}: {
  item: ItemChecklist
  fornecedorId: string
  onEnviado: () => void
  onErro: (m: string) => void
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [vencimento, setVencimento] = useState('')
  const [sobre, setSobre] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const inputId = `file-${item.tipo_documento_id}`

  async function enviar() {
    if (!arquivo) return
    setEnviando(true)
    try {
      await documentosRepo.enviarNovaVersao({
        fornecedorId,
        tipoDocumentoId: item.tipo_documento_id,
        arquivo,
        dataVencimento: item.tem_validade ? vencimento || null : null,
      })
      onEnviado()
    } catch (e) {
      onErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setSobre(true) }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSobre(false)
          const f = e.dataTransfer.files?.[0]
          if (f) setArquivo(f)
        }}
        className={`rounded-[10px] border-2 border-dashed p-6 text-center transition-colors ${
          sobre ? 'border-marca bg-marca-claro' : 'border-slate-300 bg-slate-50'
        }`}
      >
        {arquivo ? (
          <div className="text-[13.5px] font-semibold text-slate-700">{arquivo.name}</div>
        ) : (
          <>
            <div className="mb-1 text-[13.5px] font-semibold text-slate-700">
              Arraste o arquivo aqui
            </div>
            <div className="mb-3 text-[12.5px] text-slate-500">PDF, JPG ou PNG até 10MB</div>
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={inputId}
          className="mt-2 inline-block cursor-pointer rounded-lg bg-marca px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-marca-escuro"
        >
          {arquivo ? 'Trocar arquivo' : 'Selecionar arquivo'}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        {item.tem_validade ? (
          <div className="w-52">
            <Campo label="Data de vencimento">
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Campo>
          </div>
        ) : <div />}
        <Botao onClick={enviar} disabled={!arquivo || enviando}>
          {enviando ? 'Enviando…' : 'Enviar documento'}
        </Botao>
      </div>

      {!item.permite_multiplos && item.qtd_arquivos > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          A versão atual será arquivada no histórico — nada é apagado.
        </p>
      )}
    </div>
  )
}

function HistoricoModal({
  fornecedorId,
  item,
  onFechar,
  onVer,
}: {
  fornecedorId: string
  item: ItemChecklist
  onFechar: () => void
  onVer: (p: string) => void
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
        <p className="text-slate-400">Nenhuma versão registrada.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {versoes.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="truncate">{nomeArquivo(v.arquivo_path)}</span>
                  {v.is_atual && (
                    <Pill cls={estadoMeta.ok.cls}>vigente</Pill>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Enviado em {formatarData(v.data_envio)}
                  {v.data_vencimento && ` · vence ${formatarData(v.data_vencimento)}`}
                </div>
              </div>
              <Botao variante="secundario" onClick={() => onVer(v.arquivo_path)}>Ver</Botao>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function ExcluirModal({
  item,
  arquivo,
  onFechar,
  onExcluido,
}: {
  item: ItemChecklist
  arquivo: ArquivoChecklist
  onFechar: () => void
  onExcluido: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await documentosRepo.excluir(arquivo.id, motivo)
      onExcluido()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Excluir documento" aberto onFechar={onFechar}>
      <form onSubmit={confirmar} className="space-y-4">
        {erro && <Erro>{erro}</Erro>}
        <p className="text-[13.5px] text-slate-600">
          Excluir <strong className="font-semibold text-slate-900">{nomeArquivo(arquivo.arquivo_path)}</strong>{' '}
          de <strong className="font-semibold text-slate-900">{item.nome}</strong>?
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          O arquivo sai da tela e do cálculo de status, mas o registro permanece no banco com
          autor, data e motivo — a rastreabilidade da auditoria é preservada.
          {!item.permite_multiplos && ' Se houver uma versão anterior, ela volta a ser a vigente.'}
        </p>
        <Campo label="Motivo da exclusão">
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            autoFocus
            placeholder="Ex.: documento divergente, lançado no fornecedor errado…"
          />
        </Campo>
        <div className="flex justify-end gap-2 pt-1">
          <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <button
            type="submit"
            disabled={enviando || motivo.trim().length === 0}
            className="rounded-lg bg-[#B91C1C] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60"
          >
            {enviando ? 'Excluindo…' : 'Excluir documento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
