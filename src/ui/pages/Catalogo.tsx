import { useEffect, useState } from 'react'
import { catalogoRepo } from '@/infrastructure/repos'
import type { TipoDocumento, OrigemDocumento } from '@/domain/entities'
import type { DadosTipoDocumento } from '@/application/repositories'
import { Modal } from '@/ui/components/Modal'
import { Card, Cabecalho, Carregando, Erro, Vazio, Pill } from '@/ui/components/ui'
import { Campo, Input, Select, Checkbox, Botao } from '@/ui/components/form'

const vazio: DadosTipoDocumento = {
  nome: '',
  tem_validade: false,
  origem: 'fornecedor',
  permite_multiplos: false,
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

  useEffect(() => { void carregar() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModal(true)
  }

  function abrirEdicao(t: TipoDocumento) {
    setEditando(t)
    setForm({
      nome: t.nome,
      tem_validade: t.tem_validade,
      origem: t.origem,
      permite_multiplos: t.permite_multiplos,
      ativo: t.ativo,
    })
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
    <div>
      <Cabecalho
        titulo="Catálogo de Documentos"
        subtitulo="Tipos de documento exigidos por segmento"
        acao={<Botao onClick={abrirNovo} className="px-4 py-2.5 text-[13.5px]">+ Novo tipo de documento</Botao>}
      />

      {erro && <Erro>{erro}</Erro>}

      <Card className="overflow-hidden">
        <div className="th grid grid-cols-[2.2fr_1fr_1.4fr_0.6fr] border-b border-slate-200 px-[22px] py-3.5">
          <div>Documento</div>
          <div>Origem</div>
          <div>Regras</div>
          <div />
        </div>
        {carregando ? (
          <Carregando texto="Carregando…" />
        ) : tipos.length === 0 ? (
          <Vazio>Nenhum tipo cadastrado.</Vazio>
        ) : (
          tipos.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[2.2fr_1fr_1.4fr_0.6fr] items-center border-b border-slate-100 px-[22px] py-[15px] last:border-0"
            >
              <div className="min-w-0 pr-3">
                <div className="text-[13.5px] font-semibold text-slate-900">{t.nome}</div>
                {!t.ativo && <div className="mt-0.5 text-xs text-slate-400">inativo</div>}
              </div>
              <div className="text-[13px] text-slate-500">
                {t.origem === 'interno' ? 'Interno (FOR-POP)' : 'Fornecedor'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.tem_validade ? (
                  <Pill cls="bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]">monitora validade</Pill>
                ) : (
                  <span className="text-[13px] text-slate-400">sem validade</span>
                )}
                {t.permite_multiplos && (
                  <Pill cls="bg-marca-claro text-marca border-[#CFE3D8]">vários arquivos</Pill>
                )}
              </div>
              <div className="text-right">
                <button
                  onClick={() => abrirEdicao(t)}
                  className="text-[12.5px] font-semibold text-marca hover:underline"
                >
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal
        titulo={editando ? 'Editar tipo de documento' : 'Novo tipo de documento'}
        aberto={modal}
        onFechar={() => setModal(false)}
      >
        <form onSubmit={salvar} className="space-y-4">
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
          </Campo>
          <Campo label="Origem">
            <Select
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value as OrigemDocumento })}
            >
              <option value="fornecedor">Fornecedor (coletado pronto)</option>
              <option value="interno">Interno (formulário FOR-POP)</option>
            </Select>
          </Campo>
          <Checkbox
            label="Tem validade"
            descricao="Monitora o vencimento e entra nos alertas."
            checked={form.tem_validade}
            onChange={(v) => setForm({ ...form, tem_validade: v })}
          />
          <Checkbox
            label="Permite vários arquivos"
            descricao="Vários arquivos vigentes ao mesmo tempo (laudos, certificações). Basta um válido para o item ficar OK."
            checked={form.permite_multiplos}
            onChange={(v) => setForm({ ...form, permite_multiplos: v })}
          />
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
