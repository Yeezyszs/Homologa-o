-- =============================================================
-- Milestone 2 — Schema base: 8 tabelas + RLS + Storage.
-- Domínio em pt-BR. RLS ativa desde a primeira migration:
-- apenas usuários autenticados acessam.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- usuarios (espelha auth.users)
-- ---------------------------------------------------------------
create table usuarios (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '',
  email      text not null default '',
  papel      text not null default 'comprador'
             check (papel in ('admin', 'comprador')),
  created_at timestamptz not null default now()
);

-- Cria o perfil interno automaticamente quando um usuário do Auth é criado.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- segmentos (a atividade que carrega o checklist)
-- ---------------------------------------------------------------
create table segmentos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  categoria  text not null
             check (categoria in ('produto', 'servico', 'equipamento', 'transporte')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- tipos_documento (catálogo único de documentos)
-- ---------------------------------------------------------------
create table tipos_documento (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  tem_validade boolean not null default false,
  origem       text not null default 'fornecedor'
               check (origem in ('fornecedor', 'interno')),
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- segmento_documentos (checklist por segmento)
-- ---------------------------------------------------------------
create table segmento_documentos (
  id                uuid primary key default gen_random_uuid(),
  segmento_id       uuid not null references segmentos (id) on delete cascade,
  tipo_documento_id uuid not null references tipos_documento (id) on delete cascade,
  exigencia         text not null
                    check (exigencia in ('obrigatorio', 'condicional')),
  created_at        timestamptz not null default now(),
  unique (segmento_id, tipo_documento_id)
);

-- ---------------------------------------------------------------
-- fornecedores
-- ---------------------------------------------------------------
create table fornecedores (
  id                  uuid primary key default gen_random_uuid(),
  razao_social        text not null,
  cnpj                text not null unique,
  telefone            text,
  email               text,
  classificacao_risco text
                      check (classificacao_risco in ('alto', 'medio', 'baixo')),
  status              text not null default 'nao_homologado'
                      check (status in ('nao_homologado', 'pendente', 'homologado')),
  data_cadastro       date not null default current_date,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- fornecedor_segmentos (N:N)
-- ---------------------------------------------------------------
create table fornecedor_segmentos (
  id            uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores (id) on delete cascade,
  segmento_id   uuid not null references segmentos (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (fornecedor_id, segmento_id)
);

-- ---------------------------------------------------------------
-- documentos (versões — guarda histórico)
-- ---------------------------------------------------------------
create table documentos (
  id                uuid primary key default gen_random_uuid(),
  fornecedor_id     uuid not null references fornecedores (id) on delete cascade,
  tipo_documento_id uuid not null references tipos_documento (id),
  arquivo_path      text not null,
  data_envio        date not null default current_date,
  data_vencimento   date,
  is_atual          boolean not null default true,
  enviado_por       uuid references usuarios (id),
  created_at        timestamptz not null default now()
);

-- No máximo uma versão vigente por (fornecedor, tipo).
create unique index documentos_atual_unico
  on documentos (fornecedor_id, tipo_documento_id)
  where is_atual;

create index documentos_fornecedor_idx on documentos (fornecedor_id);
create index documentos_vencimento_idx
  on documentos (data_vencimento)
  where is_atual and data_vencimento is not null;

-- ---------------------------------------------------------------
-- alertas_enviados (evita reenvio do mesmo alerta)
-- ---------------------------------------------------------------
create table alertas_enviados (
  id          uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documentos (id) on delete cascade,
  tipo        text not null
              check (tipo in ('proximo_vencimento', 'vencido')),
  enviado_em  timestamptz not null default now(),
  unique (documento_id, tipo)
);

-- =============================================================
-- RLS — apenas usuários autenticados acessam (v1).
-- =============================================================
alter table usuarios             enable row level security;
alter table segmentos            enable row level security;
alter table tipos_documento      enable row level security;
alter table segmento_documentos  enable row level security;
alter table fornecedores         enable row level security;
alter table fornecedor_segmentos enable row level security;
alter table documentos           enable row level security;
alter table alertas_enviados     enable row level security;

-- Leitura para qualquer autenticado.
create policy usuarios_sel             on usuarios             for select to authenticated using (true);
create policy segmentos_sel            on segmentos            for select to authenticated using (true);
create policy tipos_documento_sel      on tipos_documento      for select to authenticated using (true);
create policy segmento_documentos_sel  on segmento_documentos  for select to authenticated using (true);
create policy fornecedores_sel         on fornecedores         for select to authenticated using (true);
create policy fornecedor_segmentos_sel on fornecedor_segmentos for select to authenticated using (true);
create policy documentos_sel          on documentos          for select to authenticated using (true);
create policy alertas_enviados_sel     on alertas_enviados     for select to authenticated using (true);

-- Escrita (insert/update/delete) para qualquer autenticado.
-- Refinamento por papel (admin x comprador) fica para uma migration futura, se necessário.
create policy segmentos_mod            on segmentos            for all to authenticated using (true) with check (true);
create policy tipos_documento_mod      on tipos_documento      for all to authenticated using (true) with check (true);
create policy segmento_documentos_mod  on segmento_documentos  for all to authenticated using (true) with check (true);
create policy fornecedores_mod         on fornecedores         for all to authenticated using (true) with check (true);
create policy fornecedor_segmentos_mod on fornecedor_segmentos for all to authenticated using (true) with check (true);
create policy documentos_mod          on documentos          for all to authenticated using (true) with check (true);

-- usuarios: cada um edita o próprio perfil.
create policy usuarios_upd on usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- =============================================================
-- Storage — bucket privado dos PDFs.
-- =============================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy documentos_storage_sel on storage.objects
  for select to authenticated using (bucket_id = 'documentos');
create policy documentos_storage_ins on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos');
create policy documentos_storage_upd on storage.objects
  for update to authenticated using (bucket_id = 'documentos');
create policy documentos_storage_del on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');
