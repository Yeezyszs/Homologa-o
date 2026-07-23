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

## Status dos milestones

| # | Milestone | Estado |
|---|-----------|--------|
| 1 | Setup (Vite + Auth + rota protegida + shell) | ✅ |
| 2 | Schema (8 tabelas + RLS + seed) | ✅ |
| 3 | Função de status + trigger + RPC do checklist | ✅ |
| 4 | Catálogo (segmentos e tipos de documento) | ⏳ |
| 5 | Fornecedores (CRUD + segmentos + risco) | 🚧 lista pronta |
| 6 | Documentos (upload + versionamento + checklist) | ⏳ |
| 7 | Dashboard + consultas | 🚧 dashboard inicial |
| 8 | Alertas (Edge Function + `pg_cron` + e-mail) | ⏳ |
