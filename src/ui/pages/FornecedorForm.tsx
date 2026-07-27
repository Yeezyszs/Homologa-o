import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fornecedoresRepo, catalogoRepo } from '@/infrastructure/repos'
import type { Segmento, ClassificacaoRisco } from '@/domain/entities'
import type { DadosFornecedor } from '@/application/repositories'
import { Campo, Input, Select, Botao, RISCOS } from '@/ui/components/form'

const vazio: DadosFornecedor = {
  razao_social: '',
  cnpj: '',
  telefone: '',
  email: '',
  classificacao_risco: null,
  segmentoIds: [],
}

export function FornecedorForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()

  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [form, setForm] = useState<DadosFornecedor>(vazio)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const segs = await catalogoRepo.listarSegmentos(true)
        if (!vivo) return
        setSegmentos(segs)
        if (id) {
          const [f, fsegs] = await Promise.all([
            fornecedoresRepo.obter(id),
            fornecedoresRepo.segmentosDo(id),
          ])
          if (!vivo) return
          if (f) {
            setForm({
              razao_social: f.razao_social,
              cnpj: f.cnpj,
              telefone: f.telefone ?? '',
              email: f.email ?? '',
              classificacao_risco: f.classificacao_risco,
              segmentoIds: fsegs.map((s) => s.id),
            })
          }
        }
      } catch (e) {
        if (vivo) setErro((e as Error).message)
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [id])

  function toggleSegmento(sid: string) {
    setForm((f) => ({
      ...f,
      segmentoIds: f.segmentoIds.includes(sid)
        ? f.segmentoIds.filter((x) => x !== sid)
        : [...f.segmentoIds, sid],
    }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const salvo = editando && id
        ? await fornecedoresRepo.atualizar(id, form)
        : await fornecedoresRepo.criar(form)
      navigate(`/fornecedores/${salvo.id}`)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p className="text-slate-500">Carregando…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">
        {editando ? 'Editar fornecedor' : 'Novo fornecedor'}
      </h1>

      {erro && <p className="text-red-600">Erro: {erro}</p>}

      <form onSubmit={salvar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <Campo label="Razão social">
          <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required autoFocus />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="CNPJ">
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} required placeholder="00.000.000/0000-00" />
          </Campo>
          <Campo label="Classificação de risco">
            <Select
              value={form.classificacao_risco ?? ''}
              onChange={(e) => setForm({ ...form, classificacao_risco: (e.target.value || null) as ClassificacaoRisco | null })}
            >
              <option value="">— não informado</option>
              {RISCOS.map((r) => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
            </Select>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Telefone">
            <Input value={form.telefone ?? ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Campo>
          <Campo label="E-mail">
            <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">Segmentos de atuação</span>
          <p className="text-xs text-slate-500">Definem o checklist de documentos exigidos.</p>
          <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2">
            {segmentos.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.segmentoIds.includes(s.id)}
                  onChange={() => toggleSegmento(s.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {s.nome}
              </label>
            ))}
            {segmentos.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">Nenhum segmento ativo. Cadastre em "Segmentos".</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="secundario" onClick={() => navigate(-1)}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
        </div>
      </form>
    </div>
  )
}
