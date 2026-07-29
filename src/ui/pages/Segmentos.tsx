import { useEffect, useState } from 'react'
import { catalogoRepo } from '@/infrastructure/repos'
import type { Segmento, TipoDocumento, CategoriaSegmento, Exigencia } from '@/domain/entities'
import type { DadosSegmento, ItemChecklistSegmento } from '@/application/repositories'
import { Modal } from '@/ui/components/Modal'
import { Card, Cabecalho, Carregando, Erro, Vazio, Pill } from '@/ui/components/ui'
import { Campo, Input, Select, Checkbox, Botao, CATEGORIAS } from '@/ui/components/form'

const vazio: DadosSegmento = { nome: '', categoria: 'servico', ativo: true }

type Exig = Exigencia | 'nao'

const CATEGORIA_CLS: Record<CategoriaSegmento, string> = {
  produto: 'bg-slate-100 text-slate-600 border-slate-200',
  servico: 'bg-slate-100 text-slate-600 border-slate-200',
  equipamento: 'bg-slate-100 text-slate-600 border-slate-200',
  transporte: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function Segmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Segmento | null>(null)
  const [form, setForm] = useState<DadosSegmento>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [checklistDe, setChecklistDe] = useState<Segmento | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const segs = await catalogoRepo.listarSegmentos()
      setSegmentos(segs)
      const c: Record<string, number> = {}
      await Promise.all(
        segs.map(async (s) => {
          try {
            c[s.id] = (await catalogoRepo.documentosDoSegmento(s.id)).length
          } catch {
            c[s.id] = 0
          }
        }),
      )
      setContagem(c)
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { void carregar() }, [])

  function abrirNovo() { setEditando(null); setForm(vazio); setModal(true) }
  function abrirEdicao(s: Segmento) {
    setEditando(s)
    setForm({ nome: s.nome, categoria: s.categoria, ativo: s.ativo })
    setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editando) await catalogoRepo.atualizarSegmento(editando.id, form)
      else await catalogoRepo.criarSegmento(form)
      setModal(false)
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Cabecalho
        titulo="Segmentos"
        subtitulo="Atividades que definem o checklist de documentos"
        acao={<Botao onClick={abrirNovo} className="px-4 py-2.5 text-[13.5px]">+ Novo segmento</Botao>}
      />

      {erro && <Erro>{erro}</Erro>}

      <Card className="overflow-hidden">
        <div className="th grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border-slate-200 px-[22px] py-3.5">
          <div>Nome</div>
          <div>Categoria</div>
          <div>Documentos</div>
          <div />
        </div>
        {carregando ? (
          <Carregando texto="Carregando…" />
        ) : segmentos.length === 0 ? (
          <Vazio>Nenhum segmento cadastrado.</Vazio>
        ) : (
          segmentos.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[1.8fr_1fr_1fr_1fr] items-center border-b border-slate-100 px-[22px] py-[15px] last:border-0"
            >
              <div className="min-w-0 pr-3">
                <div className="text-[13.5px] font-semibold text-slate-900">{s.nome}</div>
                {!s.ativo && <div className="mt-0.5 text-xs text-slate-400">inativo</div>}
              </div>
              <div>
                <Pill cls={CATEGORIA_CLS[s.categoria]}>{s.categoria}</Pill>
              </div>
              <div className="text-[13.5px] text-slate-700">{contagem[s.id] ?? 0}</div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setChecklistDe(s)}
                  className="text-[12.5px] font-semibold text-marca hover:underline"
                >
                  Checklist
                </button>
                <button
                  onClick={() => abrirEdicao(s)}
                  className="text-[12.5px] font-semibold text-slate-500 hover:underline"
                >
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal titulo={editando ? 'Editar segmento' : 'Novo segmento'} aberto={modal} onFechar={() => setModal(false)}>
        <form onSubmit={salvar} className="space-y-4">
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
          </Campo>
          <Campo label="Categoria">
            <Select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaSegmento })}
            >
              {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </Select>
          </Campo>
          <Checkbox label="Ativo" checked={form.ativo ?? true} onChange={(v) => setForm({ ...form, ativo: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <Botao type="button" variante="secundario" onClick={() => setModal(false)}>Cancelar</Botao>
            <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
          </div>
        </form>
      </Modal>

      {checklistDe && (
        <ChecklistSegmento
          segmento={checklistDe}
          onFechar={() => setChecklistDe(null)}
          onSalvo={async () => { setChecklistDe(null); await carregar() }}
        />
      )}
    </div>
  )
}

function ChecklistSegmento({
  segmento,
  onFechar,
  onSalvo,
}: {
  segmento: Segmento
  onFechar: () => void
  onSalvo: () => void
}) {
  const [tipos, setTipos] = useState<TipoDocumento[]>([])
  const [selecao, setSelecao] = useState<Record<string, Exig>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [todos, atuais] = await Promise.all([
          catalogoRepo.listarTiposDocumento(true),
          catalogoRepo.documentosDoSegmento(segmento.id),
        ])
        if (!vivo) return
        const mapa: Record<string, Exig> = {}
        for (const t of todos) mapa[t.id] = 'nao'
        for (const a of atuais) mapa[a.tipo_documento_id] = a.exigencia
        setTipos(todos)
        setSelecao(mapa)
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [segmento.id])

  async function salvar() {
    setSalvando(true)
    try {
      const itens: ItemChecklistSegmento[] = Object.entries(selecao)
        .filter(([, e]) => e !== 'nao')
        .map(([tipo_documento_id, e]) => ({ tipo_documento_id, exigencia: e as Exigencia }))
      await catalogoRepo.definirChecklistSegmento(segmento.id, itens)
      onSalvo()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const total = Object.values(selecao).filter((e) => e !== 'nao').length

  return (
    <Modal titulo={`Checklist — ${segmento.nome}`} aberto onFechar={onFechar} largura="max-w-2xl">
      {erro && <Erro>{erro}</Erro>}
      {carregando ? (
        <Carregando texto="Carregando…" />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-slate-500">
            Marque a exigência de cada documento neste segmento. {total} selecionado(s).
          </p>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
            {tipos.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50"
              >
                <span className="text-[13.5px] text-slate-700">{t.nome}</span>
                <Select
                  value={selecao[t.id] ?? 'nao'}
                  onChange={(e) => setSelecao({ ...selecao, [t.id]: e.target.value as Exig })}
                  className="mt-0 w-40 shrink-0"
                >
                  <option value="nao">— não exige</option>
                  <option value="obrigatorio">Obrigatório</option>
                  <option value="condicional">Condicional</option>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
            <Botao type="button" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar checklist'}
            </Botao>
          </div>
        </>
      )}
    </Modal>
  )
}
