import { useEffect, useState } from 'react'
import { catalogoRepo } from '@/infrastructure/repos'
import type { Segmento, TipoDocumento, CategoriaSegmento, Exigencia } from '@/domain/entities'
import type { DadosSegmento, ItemChecklistSegmento } from '@/application/repositories'
import { Modal } from '@/ui/components/Modal'
import { Badge } from '@/ui/components/Badge'
import { Campo, Input, Select, Checkbox, Botao, CATEGORIAS } from '@/ui/components/form'

const vazio: DadosSegmento = { nome: '', categoria: 'servico', ativo: true }

type Exig = Exigencia | 'nao'

export function Segmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // modal de segmento
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Segmento | null>(null)
  const [form, setForm] = useState<DadosSegmento>(vazio)
  const [salvando, setSalvando] = useState(false)

  // modal de checklist
  const [checklistDe, setChecklistDe] = useState<Segmento | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      setSegmentos(await catalogoRepo.listarSegmentos())
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModal(true)
  }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Segmentos</h1>
        <Botao onClick={abrirNovo}>Novo segmento</Botao>
      </div>

      {erro && <p className="text-red-600">Erro: {erro}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Segmento</th>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Ativo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : segmentos.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum segmento cadastrado.</td></tr>
            ) : (
              segmentos.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{s.nome}</td>
                  <td className="px-4 py-2"><Badge className="bg-slate-100 text-slate-700 ring-slate-500/20">{s.categoria}</Badge></td>
                  <td className="px-4 py-2">{s.ativo ? <span className="text-green-600">sim</span> : <span className="text-slate-400">não</span>}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Botao variante="secundario" onClick={() => setChecklistDe(s)}>Checklist</Botao>
                      <Botao variante="secundario" onClick={() => abrirEdicao(s)}>Editar</Botao>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal titulo={editando ? 'Editar segmento' : 'Novo segmento'} aberto={modal} onFechar={() => setModal(false)}>
        <form onSubmit={salvar} className="space-y-4">
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
          </Campo>
          <Campo label="Categoria">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaSegmento })}>
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
        />
      )}
    </div>
  )
}

function ChecklistSegmento({ segmento, onFechar }: { segmento: Segmento; onFechar: () => void }) {
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
      onFechar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const total = Object.values(selecao).filter((e) => e !== 'nao').length

  return (
    <Modal titulo={`Checklist — ${segmento.nome}`} aberto onFechar={onFechar} largura="max-w-2xl">
      {erro && <p className="mb-3 text-red-600">Erro: {erro}</p>}
      {carregando ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Marque a exigência de cada documento neste segmento. {total} selecionado(s).
          </p>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
            {tipos.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <span className="text-sm text-slate-700">{t.nome}</span>
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
            <Botao type="button" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar checklist'}</Botao>
          </div>
        </>
      )}
    </Modal>
  )
}
