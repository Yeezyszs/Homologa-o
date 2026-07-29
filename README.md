# Homologação de Fornecedores — Sumaré

Sistema web interno para **cadastrar fornecedores, controlar a documentação de
homologação, calcular o status automaticamente e alertar sobre vencimentos**,
sob a lente de **segurança de alimentos**.

Operação 100% interna: o comprador cadastra o fornecedor, sobe os documentos e
informa as validades. Não há portal nem login de fornecedor no v1.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Supabase (Postgres com RLS, Storage, Auth, Edge Functions + `pg_cron`)
- **E-mail:** Edge Function via provedor configurável (ex.: Resend)

## Arquitetura

Clean Architecture proporcional ao projeto:

- `src/domain/` — tipos do negócio e helpers puros (sem React nem Supabase), testáveis.
- `src/application/repositories/` — **interfaces** dos repositórios. A UI depende só destas.
- `src/infrastructure/supabase/` — implementações concretas (Supabase como plugin).
- `src/ui/` — páginas, componentes e hooks.
- `supabase/` — migrations (schema + RLS + função de status), seed e Edge Functions.

**Fonte única da verdade do status:** o cálculo mora no Postgres
(`recalcular_status_fornecedor`), não no front. O trigger em `documentos` e o
cron de alertas leem sempre o mesmo resultado materializado.

## Design

A UI segue o design "Homologacao Sumare" (Claude Design). Os tokens vivem em
`tailwind.config.js` (verde de marca) e `src/ui/theme.ts` (status, risco,
formatação de datas).

- **Marca:** verde `#1F5B3F` — nav ativa, links, botões primários e foco. Usado
  com moderação: ação e navegação, nunca decoração.
- **Status** (esmeralda / âmbar / vermelho) e **risco** (cinza / azul / roxo)
  usam paletas **diferentes** de propósito, para as duas colunas nunca se
  confundirem na tabela.
- Cards: radius 12px, borda 1px, sem sombra pesada. Modo claro apenas.

## Regras de documento

- **Múltiplos arquivos:** tipos com `permite_multiplos` (ficha técnica, laudos,
  certificações) aceitam vários arquivos vigentes ao mesmo tempo. O item do
  checklist fica OK quando **ao menos um** arquivo está válido — mesma regra do
  `recalcular_status_fornecedor`. O flag é editável na tela de Catálogo.
- **Exclusão:** documento lançado errado é removido por **soft delete**
  (`excluir_documento`), com motivo obrigatório. O registro permanece no banco
  com autor, data e motivo — a rastreabilidade exigida em segurança de alimentos
  é preservada. Em tipos de arquivo único, a versão anterior volta a ser vigente.

## Rodando o frontend

```bash
npm install
cp .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Scripts: `npm run dev` · `npm run build` · `npm run test` · `npm run lint`

## Banco de dados

As migrations ficam em `supabase/migrations/` e o catálogo inicial em
`supabase/seed/seed.sql`.

Com o [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase db push          # aplica as migrations no projeto vinculado
psql "$DATABASE_URL" -f supabase/seed/seed.sql   # popula o catálogo (re-executável)
```

- `0001_schema.sql` — 8 tabelas + RLS (apenas autenticados) + bucket de Storage.
- `0002_status.sql` — `recalcular_status_fornecedor`, trigger em `documentos` e
  a RPC `get_checklist_fornecedor` consumida pela UI.
- `0003_hardening_rpc_grants.sql` — fecha as funções `SECURITY DEFINER` para `anon`.
- `0004_multiplos_e_exclusao.sql` — `permite_multiplos`, soft delete de documento
  (`excluir_documento`), checklist agregando vários arquivos e a RPC
  `get_checklist_geral` que alimenta dashboard e relatórios.

O arquivo `supabase/setup_completo.sql` junta todas as migrations e o seed para
aplicar de uma vez em um projeto novo pelo SQL Editor.

## Status dos milestones

| # | Milestone | Estado |
|---|-----------|--------|
| 1 | Setup (Vite + Auth + rota protegida + shell) | ✅ |
| 2 | Schema (8 tabelas + RLS + seed) | ✅ |
| 3 | Função de status + trigger + RPC do checklist | ✅ |
| 4 | Catálogo (segmentos e tipos de documento) | ✅ |
| 5 | Fornecedores (CRUD + segmentos + risco) | ✅ |
| 6 | Documentos (upload + versionamento + checklist) | ✅ |
| 7 | Dashboard + consultas | ✅ |
| 8 | Alertas (Edge Function + `pg_cron` + e-mail) | ⏳ |
