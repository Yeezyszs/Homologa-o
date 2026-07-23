-- =============================================================
-- SETUP COMPLETO — cole tudo isto no SQL Editor do Supabase e rode UMA vez
-- (projeto novo/vazio). Ordem: schema -> funcao de status -> seed do catalogo.
-- Gerado a partir de supabase/migrations/*.sql + supabase/seed/seed.sql
-- =============================================================

-- ========== 0001_schema.sql ==========
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

-- ========== 0002_status.sql ==========
-- =============================================================
-- Milestone 3 — Cálculo de status (fonte única da verdade no Postgres).
--   * recalcular_status_fornecedor(uuid)  -> grava fornecedores.status
--   * trigger em documentos               -> recalcula em insert/update/delete
--   * get_checklist_fornecedor(uuid)      -> checklist resolvido para a UI
-- =============================================================

-- ---------------------------------------------------------------
-- recalcular_status_fornecedor
--   nao_homologado : fornecedor sem nenhum documento
--   homologado     : todos os obrigatórios satisfeitos (condicionais ignorados)
--   pendente       : algum obrigatório faltando ou vencido
-- Um obrigatório está satisfeito quando existe versão vigente do tipo e,
-- se o tipo tem validade, data_vencimento >= current_date.
-- ---------------------------------------------------------------
create or replace function recalcular_status_fornecedor(p_fornecedor_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_tem_documento boolean;
  v_faltantes     int;
  v_status        text;
begin
  select exists (
    select 1 from documentos d where d.fornecedor_id = p_fornecedor_id
  ) into v_tem_documento;

  if not v_tem_documento then
    v_status := 'nao_homologado';
  else
    -- checklist obrigatório: tipos obrigatórios dos segmentos do fornecedor
    with obrigatorios as (
      select distinct sd.tipo_documento_id, td.tem_validade
      from fornecedor_segmentos fs
      join segmento_documentos sd on sd.segmento_id = fs.segmento_id
      join tipos_documento td      on td.id = sd.tipo_documento_id
      where fs.fornecedor_id = p_fornecedor_id
        and sd.exigencia = 'obrigatorio'
    )
    select count(*) into v_faltantes
    from obrigatorios o
    where not exists (
      select 1 from documentos d
      where d.fornecedor_id = p_fornecedor_id
        and d.tipo_documento_id = o.tipo_documento_id
        and d.is_atual
        and (not o.tem_validade
             or (d.data_vencimento is not null and d.data_vencimento >= current_date))
    );

    v_status := case when v_faltantes = 0 then 'homologado' else 'pendente' end;
  end if;

  update fornecedores set status = v_status where id = p_fornecedor_id;
  return v_status;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger em documentos → recalcula o fornecedor afetado.
-- ---------------------------------------------------------------
create or replace function trg_documentos_recalcula()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform recalcular_status_fornecedor(old.fornecedor_id);
    return old;
  end if;
  perform recalcular_status_fornecedor(new.fornecedor_id);
  return new;
end;
$$;

create trigger documentos_recalcula_status
  after insert or update or delete on documentos
  for each row execute function trg_documentos_recalcula();

-- ---------------------------------------------------------------
-- get_checklist_fornecedor — checklist resolvido para a UI.
-- Um tipo exigido em vários segmentos aparece uma vez; obrigatório
-- prevalece sobre condicional. Estado espelha domain/checklist.ts.
-- ---------------------------------------------------------------
create or replace function get_checklist_fornecedor(p_fornecedor_id uuid)
returns table (
  tipo_documento_id uuid,
  nome              text,
  exigencia         text,
  tem_validade      boolean,
  estado            text,
  data_vencimento   date,
  arquivo_path      text,
  documento_id      uuid
)
language sql
stable
security definer set search_path = public
as $$
  with exigidos as (
    select
      sd.tipo_documento_id,
      -- obrigatório prevalece sobre condicional
      case when bool_or(sd.exigencia = 'obrigatorio')
           then 'obrigatorio' else 'condicional' end as exigencia
    from fornecedor_segmentos fs
    join segmento_documentos sd on sd.segmento_id = fs.segmento_id
    where fs.fornecedor_id = p_fornecedor_id
    group by sd.tipo_documento_id
  )
  select
    td.id                          as tipo_documento_id,
    td.nome                        as nome,
    e.exigencia                    as exigencia,
    td.tem_validade                as tem_validade,
    case
      when d.id is null                         then 'faltando'
      when not td.tem_validade                  then 'ok'
      when d.data_vencimento is null            then 'aguardando'
      when d.data_vencimento >= current_date    then 'ok'
      else                                           'vencido'
    end                            as estado,
    d.data_vencimento              as data_vencimento,
    d.arquivo_path                 as arquivo_path,
    d.id                           as documento_id
  from exigidos e
  join tipos_documento td on td.id = e.tipo_documento_id
  left join documentos d
    on d.fornecedor_id = p_fornecedor_id
   and d.tipo_documento_id = e.tipo_documento_id
   and d.is_atual
  order by
    (e.exigencia = 'obrigatorio') desc,
    td.nome;
$$;

-- ========== seed.sql ==========
-- =============================================================
-- Seed — catálogo inicial (dados reais da Sumaré).
-- Fonte: FOR-POP 7 2.0 — Controle de documentos.
-- Ponto de partida editável; a empresa refina depois.
-- Re-executável: só popula tabelas ainda vazias.
-- =============================================================

do $$
begin

-- ---- Tipos de documento --------------------------------------
if (select count(*) from tipos_documento) = 0 then
  insert into tipos_documento (nome, tem_validade, origem) values
    ('Alvará de funcionamento', true,  'fornecedor'),
    ('Licença sanitária', true,  'fornecedor'),
    ('Licença ambiental / de operação', true,  'fornecedor'),
    ('AVCB / Certificado do Corpo de Bombeiros', true,  'fornecedor'),
    ('Responsável técnico (CRQ/CRBio)', false, 'fornecedor'),
    ('Ficha técnica do produto/serviço', false, 'fornecedor'),
    ('FISPQ / Ficha de segurança (FDS)', false, 'fornecedor'),
    ('Declaração food grade / NSF', false, 'fornecedor'),
    ('Plano/relatórios ou certificado de controle de pragas', true,  'fornecedor'),
    ('Acreditação ISO/IEC 17025 + escopo', true,  'fornecedor'),
    ('Certificações vigentes (ISO/FSSC/BPF/NSF)', true,  'fornecedor'),
    ('Laudo de análise / relatório técnico', true,  'fornecedor'),
    ('Laudo de migração (embalagens)', true,  'fornecedor'),
    ('Certificado de calibração RBC/Inmetro', true,  'fornecedor'),
    ('Certificado de material (inox/plástico)', false, 'fornecedor'),
    ('Declaração de ausência de OGM, alérgenos e radiação', false, 'fornecedor'),
    ('Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', false, 'fornecedor'),
    ('Proposta comercial', false, 'fornecedor'),
    ('Questionário de avaliação (FOR POP07 1.5)', false, 'interno'),
    ('Carta de Garantia do Fornecedor (FOR-POP 7 2.2)', false, 'interno'),
    ('Carta compromisso com produtor rural (FOR POP 7 1.9)', false, 'interno'),
    ('Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)', false, 'interno'),
    ('Questionário de Avaliação de Produtores (FOR POP07 1.1)', false, 'interno'),
    ('Diploma de formação (responsável técnico)', false, 'fornecedor'),
    ('Currículo do nutricionista responsável', false, 'fornecedor'),
    ('Licença específica para preparo/transporte de alimentos', true,  'fornecedor'),
    ('Termo de Compromisso (transportadora)', false, 'interno'),
    ('Declaração da Transportadora', false, 'fornecedor'),
    ('Certificado de regularidade IBAMA', true,  'fornecedor'),
    ('ATTIPP — Transporte de produtos perigosos', true,  'fornecedor'),
    ('ART — Anotação de Responsabilidade Técnica', true,  'fornecedor'),
    ('Certificado de destinação de resíduos', true,  'fornecedor'),
    ('MTR — Manifesto de Transporte de Resíduos', true,  'fornecedor');
end if;

-- ---- Segmentos (atividades) ----------------------------------
if (select count(*) from segmentos) = 0 then
  insert into segmentos (nome, categoria) values
    -- Serviços
    ('Laboratório de análises', 'servico'),
    ('Controle de pragas', 'servico'),
    ('Serviços ambientais', 'servico'),
    ('Limpeza de caixa d''água', 'servico'),
    ('Consultoria em segurança de alimentos', 'servico'),
    ('Refeição coletiva', 'servico'),
    ('Higienização e manutenção de big bags', 'servico'),
    ('Coleta e destinação de resíduos', 'servico'),
    ('Calibração', 'servico'),
    -- Produtos
    ('Matéria-prima/produtor rural', 'produto'),
    ('Produto químico para caldeira', 'produto'),
    ('Produto químico para tratamento de água potável', 'produto'),
    ('Produto químico para higienização de equipamentos', 'produto'),
    ('Lubrificantes/óleo/graxa', 'produto'),
    ('Embalagens primárias (bag e sacaria)', 'produto'),
    ('Filme stretch/sacos plásticos', 'produto'),
    ('EPIs', 'produto'),
    -- Equipamentos
    ('Equipamentos', 'equipamento'),
    ('Material de manutenção (peças)', 'equipamento'),
    -- Transporte
    ('Transportadora', 'transporte');
end if;

-- ---- Checklists de exemplo (segmento_documentos) -------------
if (select count(*) from segmento_documentos) = 0 then
  insert into segmento_documentos (segmento_id, tipo_documento_id, exigencia)
  select s.id, t.id, v.exigencia
  from (values
    -- Calibração
    ('Calibração', 'Alvará de funcionamento', 'obrigatorio'),
    ('Calibração', 'Licença ambiental / de operação', 'obrigatorio'),
    ('Calibração', 'Acreditação ISO/IEC 17025 + escopo', 'obrigatorio'),
    ('Calibração', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Calibração', 'Certificado de calibração RBC/Inmetro', 'condicional'),
    ('Calibração', 'Certificações vigentes (ISO/FSSC/BPF/NSF)', 'condicional'),
    -- Controle de pragas
    ('Controle de pragas', 'Alvará de funcionamento', 'obrigatorio'),
    ('Controle de pragas', 'Licença sanitária', 'obrigatorio'),
    ('Controle de pragas', 'Licença ambiental / de operação', 'obrigatorio'),
    ('Controle de pragas', 'Ficha técnica do produto/serviço', 'obrigatorio'),
    ('Controle de pragas', 'Declaração de ausência de OGM, alérgenos e radiação', 'obrigatorio'),
    ('Controle de pragas', 'Laudo de análise / relatório técnico', 'obrigatorio'),
    ('Controle de pragas', 'Questionário de avaliação (FOR POP07 1.5)', 'obrigatorio'),
    ('Controle de pragas', 'Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', 'obrigatorio'),
    ('Controle de pragas', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Controle de pragas', 'Certificações vigentes (ISO/FSSC/BPF/NSF)', 'condicional'),
    -- Transportadora
    ('Transportadora', 'Alvará de funcionamento', 'obrigatorio'),
    ('Transportadora', 'Licença sanitária', 'obrigatorio'),
    ('Transportadora', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Transportadora', 'Termo de Compromisso (transportadora)', 'obrigatorio'),
    ('Transportadora', 'Declaração da Transportadora', 'obrigatorio'),
    -- Matéria-prima/produtor rural
    ('Matéria-prima/produtor rural', 'Carta compromisso com produtor rural (FOR POP 7 1.9)', 'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)', 'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Questionário de Avaliação de Produtores (FOR POP07 1.1)', 'obrigatorio')
  ) as v(segmento, tipo, exigencia)
  join segmentos s        on s.nome = v.segmento
  join tipos_documento t  on t.nome = v.tipo;
end if;

end $$;
