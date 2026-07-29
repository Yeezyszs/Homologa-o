import { describe, it, expect } from 'vitest'
import {
  estadoItemChecklist,
  statusPeloChecklist,
  pendenciasObrigatorias,
  toDateOnly,
} from '@/domain/checklist'
import type { ItemChecklist } from '@/domain/entities'

const HOJE = '2026-07-23'

function item(p: Partial<ItemChecklist>): ItemChecklist {
  const qtd = p.qtd_arquivos ?? (p.arquivos?.length || 0)
  return {
    tipo_documento_id: p.tipo_documento_id ?? crypto.randomUUID(),
    nome: p.nome ?? 'Documento',
    exigencia: p.exigencia ?? 'obrigatorio',
    tem_validade: p.tem_validade ?? false,
    permite_multiplos: p.permite_multiplos ?? false,
    estado: p.estado ?? 'faltando',
    data_vencimento: p.data_vencimento ?? null,
    arquivo_path: p.arquivo_path ?? null,
    documento_id: p.documento_id ?? null,
    qtd_arquivos: qtd,
    arquivos: p.arquivos ?? [],
  }
}

describe('toDateOnly', () => {
  it('corta o horário de uma string ISO', () => {
    expect(toDateOnly('2026-07-23T13:45:00Z')).toBe('2026-07-23')
  })
})

describe('estadoItemChecklist', () => {
  it('faltando quando não há nenhum arquivo vigente', () => {
    expect(estadoItemChecklist({ temValidade: true, vencimentos: [] }, HOJE)).toBe('faltando')
  })

  it('ok quando há arquivo e o tipo não tem validade', () => {
    expect(estadoItemChecklist({ temValidade: false, vencimentos: [null] }, HOJE)).toBe('ok')
  })

  it('aguardando quando tem validade mas a data não foi informada', () => {
    expect(estadoItemChecklist({ temValidade: true, vencimentos: [null] }, HOJE)).toBe('aguardando')
  })

  it('ok quando vence hoje (>= hoje)', () => {
    expect(estadoItemChecklist({ temValidade: true, vencimentos: [HOJE] }, HOJE)).toBe('ok')
  })

  it('ok quando vence no futuro', () => {
    expect(estadoItemChecklist({ temValidade: true, vencimentos: ['2026-12-31'] }, HOJE)).toBe('ok')
  })

  it('vencido quando a data já passou', () => {
    expect(estadoItemChecklist({ temValidade: true, vencimentos: ['2026-07-22'] }, HOJE)).toBe('vencido')
  })

  // --- múltiplos arquivos: "basta um válido" ---

  it('ok quando um dos arquivos está válido e outro vencido', () => {
    expect(
      estadoItemChecklist({ temValidade: true, vencimentos: ['2026-01-01', '2026-12-31'] }, HOJE),
    ).toBe('ok')
  })

  it('vencido quando todos os arquivos venceram', () => {
    expect(
      estadoItemChecklist({ temValidade: true, vencimentos: ['2026-07-01', '2026-07-22'] }, HOJE),
    ).toBe('vencido')
  })

  it('ok quando um arquivo está válido e outro sem data', () => {
    expect(
      estadoItemChecklist({ temValidade: true, vencimentos: [null, '2026-12-31'] }, HOJE),
    ).toBe('ok')
  })

  it('aguardando quando os vencidos convivem com um sem data informada', () => {
    expect(
      estadoItemChecklist({ temValidade: true, vencimentos: ['2026-07-01', null] }, HOJE),
    ).toBe('aguardando')
  })
})

describe('statusPeloChecklist', () => {
  it('nao_homologado quando não há nenhum documento', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'faltando' }),
      item({ exigencia: 'obrigatorio', estado: 'faltando' }),
    ]
    expect(statusPeloChecklist(itens)).toBe('nao_homologado')
  })

  it('pendente quando falta algum obrigatório', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 1 }),
      item({ exigencia: 'obrigatorio', estado: 'faltando' }),
    ]
    expect(statusPeloChecklist(itens)).toBe('pendente')
  })

  it('pendente quando um obrigatório está vencido', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 1 }),
      item({ exigencia: 'obrigatorio', estado: 'vencido', tem_validade: true, qtd_arquivos: 1 }),
    ]
    expect(statusPeloChecklist(itens)).toBe('pendente')
  })

  it('homologado quando todos os obrigatórios estão ok', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 1 }),
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 2, permite_multiplos: true }),
    ]
    expect(statusPeloChecklist(itens)).toBe('homologado')
  })

  it('ignora condicionais: condicional faltando não impede homologação', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 1 }),
      item({ exigencia: 'condicional', estado: 'faltando' }),
    ]
    expect(statusPeloChecklist(itens)).toBe('homologado')
  })
})

describe('pendenciasObrigatorias', () => {
  it('retorna só os obrigatórios não satisfeitos', () => {
    const itens = [
      item({ exigencia: 'obrigatorio', estado: 'ok', qtd_arquivos: 1, nome: 'A' }),
      item({ exigencia: 'obrigatorio', estado: 'vencido', qtd_arquivos: 1, nome: 'B' }),
      item({ exigencia: 'obrigatorio', estado: 'faltando', nome: 'C' }),
      item({ exigencia: 'condicional', estado: 'faltando', nome: 'D' }),
    ]
    const nomes = pendenciasObrigatorias(itens).map((i) => i.nome)
    expect(nomes).toEqual(['B', 'C'])
  })
})
