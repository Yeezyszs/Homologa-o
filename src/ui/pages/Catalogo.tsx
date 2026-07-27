import { useEffect, useState } from 'react'
import { catalogoRepo } from '@/infrastructure/repos'
import type { TipoDocumento, OrigemDocumento } from '@/domain/entities'
import type { DadosTipoDocumento } from '@/application/repositories'
import { Modal } from '@/ui/components/Modal'
import { Badge } from '@/ui/components/Badge'
import { Campo, Input, Select, Checkbox, Botao } from '@/ui/components/form'

const vazio: DadosTipoDocumento = {
  nome: '',
  tem_validade: false,
  origem: 'fornecedor',
  ativo: true,
}

export function Catalogo() {
  const [tipos, setTipos] = useState<TipoDocumento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<TipoDocumento | null>(null)
  const [form, setForm] = useState<DadosTipoDocumento>(vazio)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      setTipos(await catalogoRepo.listarTiposDocumento())
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

  function abrirEdicao(t: TipoDocumento) {
    setEditando(t)
    setForm({ nome: t.nome, tem_validade: t.tem_validade, origem: t.origem, ativo: t.ativo })
    setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editando) await catalogoRepo.atualizarTipoDocumento(editando.id, form)
      else await catalogoRepo.criarTipoDocumento(form)
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
        <h1 className="text-xl font-semibold text-slate-800">Catálogo de documentos</h1>
        <Botao onClick={abrirNovo}>Novo tipo</Botao>
      </div>

      {erro && <p className="text-red-600">Erro: {erro}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Documento</th>
              <th className="px-4 py-2 font-medium">Vencimento</th>
              <th className="px-4 py-2 font-medium">Origem</th>
              <th className="px-4 py-2 font-medium">Ativo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : tipos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum tipo cadastrado.</td></tr>
            ) : (
              tipos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{t.nome}</td>
                  <td className="px-4 py-2">
                    {t.tem_validade
                      ? <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">monitora</Badge>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{t.origem}</td>
                  <td className="px-4 py-2">
                    {t.ativo
                      ? <span className="text-green-600">sim</span>
                      : <span className="text-slate-400">não</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Botao variante="secundario" onClick={() => abrirEdicao(t)}>Editar</Botao>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal titulo={editando ? 'Editar tipo de documento' : 'Novo tipo de documento'} aberto={modal} onFechar={() => setModal(false)}>
        <form onSubmit={salvar} className="space-y-4">
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
          </Campo>
          <Campo label="Origem">
            <Select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value as OrigemDocumento })}>
              <option value="fornecedor">Fornecedor (coletado pronto)</option>
              <option value="interno">Interno (formulário FOR-POP)</option>
            </Select>
          </Campo>
          <Checkbox label="Tem validade (monitorar vencimento)" checked={form.tem_validade} onChange={(v) => setForm({ ...form, tem_validade: v })} />
          <Checkbox label="Ativo" checked={form.ativo ?? true} onChange={(v) => setForm({ ...form, ativo: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <Botao type="button" variante="secundario" onClick={() => setModal(false)}>Cancelar</Botao>
            <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
          </div>
        </form>
      </Modal>
    </div>
  )
}
