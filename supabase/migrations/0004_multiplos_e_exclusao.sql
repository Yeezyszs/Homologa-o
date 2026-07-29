-- =============================================================
-- 0004 — Dois ajustes pedidos pela operação:
--   (1) Múltiplos arquivos vigentes para um mesmo tipo de documento
--       (ficha técnica, laudos, certificações...).
--   (2) Exclusão de documento lançado errado via SOFT DELETE com motivo,
--       preservando a rastreabilidade exigida em segurança de alimentos.
-- =============================================================

-- ---------------------------------------------------------------
-- (1) permite_multiplos no catálogo
-- ---------------------------------------------------------------
alter table tipos_documento
  add column if not exists permite_multiplos boolean not null default false;

update tipos_documento set permite_multiplos = true
where nome in (
  'Ficha técnica do produto/serviço',
  'Laudo de migração (embalagens)',
  'Laudo de análise / relatório técnico',
  'Certificações vigentes (ISO/FSSC/BPF/NSF)'
);

-- ---------------------------------------------------------------
-- (2) colunas de soft delete
-- ---------------------------------------------------------------
alter table documentos
  add column if not exists excluido_em     timestamptz,
  add column if not exists excluido_por    uuid references usuarios (id),
  add column if not exists motivo_exclusao text;

-- ---------------------------------------------------------------
-- Índices: a unicidade de "uma versão vigente por (fornecedor, tipo)"
-- deixa de valer para tipos multi, então sai o índice único e entra
-- um trigger que respeita permite_multiplos.
-- ---------------------------------------------------------------
drop index if exists documentos_atual_unico;
drop index if exists documentos_vencimento_idx;

create index if not exists documentos_vigentes_idx
  on documentos (fornecedor_id, tipo_documento_id)
  where is_atual and excluido_em is null;

create index if not exists documentos_vencimento_idx
  on documentos (data_vencimento)
  where is_atual and excluido_em is null and data_vencimento is not null;

-- Ao inserir uma nova versão vigente de um tipo que NÃO permite múltiplos,
-- aposenta automaticamente a anterior (o histórico é preservado).
create or replace function trg_documentos_versiona()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_multi boolean;
begin
  if new.is_atual and new.excluido_em is null then
    select coalesce(permite_multiplos, false) into v_multi
      from tipos_documento where id = new.tipo_documento_id;

    if not v_multi then
      update documentos set is_atual = false
       where fornecedor_id = new.fornecedor_id
         and tipo_documento_id = new.tipo_documento_id
         and is_atual
         and excluido_em is null
         and id <> new.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documentos_versiona on documentos;
create trigger documentos_versiona
  before insert on documentos
  for each row execute function trg_documentos_versiona();

-- ---------------------------------------------------------------
-- Cálculo de status: passa a ignorar documentos excluídos.
-- Regra dos tipos multi: basta UM arquivo vigente e válido.
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
    select 1 from documentos d
    where d.fornecedor_id = p_fornecedor_id and d.excluido_em is null
  ) into v_tem_documento;

  if not v_tem_documento then
    v_status := 'nao_homologado';
  else
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
        and d.excluido_em is null
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
-- Checklist do fornecedor: uma linha por tipo exigido, agregando
-- todos os arquivos vigentes daquele tipo em `arquivos` (jsonb).
-- ---------------------------------------------------------------
drop function if exists get_checklist_fornecedor(uuid);

create function get_checklist_fornecedor(p_fornecedor_id uuid)
returns table (
  tipo_documento_id uuid,
  nome              text,
  exigencia         text,
  tem_validade      boolean,
  permite_multiplos boolean,
  estado            text,
  data_vencimento   date,
  arquivo_path      text,
  documento_id      uuid,
  qtd_arquivos      integer,
  arquivos          jsonb
)
language sql
stable
security definer set search_path = public
as $$
  with exigidos as (
    select
      sd.tipo_documento_id,
      case when bool_or(sd.exigencia = 'obrigatorio')
           then 'obrigatorio' else 'condicional' end as exigencia
    from fornecedor_segmentos fs
    join segmento_documentos sd on sd.segmento_id = fs.segmento_id
    where fs.fornecedor_id = p_fornecedor_id
    group by sd.tipo_documento_id
  ),
  atuais as (
    select
      d.tipo_documento_id,
      count(*)::int as qtd,
      bool_or(d.data_vencimento is not null and d.data_vencimento >= current_date) as tem_valido,
      bool_or(d.data_vencimento is null) as tem_sem_data,
      min(d.data_vencimento) filter (where d.data_vencimento >= current_date) as prox_valido,
      max(d.data_vencimento) as max_venc,
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'arquivo_path', d.arquivo_path,
          'data_envio', d.data_envio,
          'data_vencimento', d.data_vencimento
        ) order by d.data_envio desc, d.created_at desc
      ) as arquivos
    from documentos d
    where d.fornecedor_id = p_fornecedor_id
      and d.is_atual
      and d.excluido_em is null
    group by d.tipo_documento_id
  )
  select
    td.id,
    td.nome,
    e.exigencia,
    td.tem_validade,
    td.permite_multiplos,
    case
      when coalesce(a.qtd, 0) = 0        then 'faltando'
      when not td.tem_validade           then 'ok'
      when coalesce(a.tem_valido, false) then 'ok'
      when coalesce(a.tem_sem_data, false) then 'aguardando'
      else                                    'vencido'
    end,
    coalesce(a.prox_valido, a.max_venc),
    (a.arquivos -> 0 ->> 'arquivo_path'),
    (a.arquivos -> 0 ->> 'id')::uuid,
    coalesce(a.qtd, 0),
    coalesce(a.arquivos, '[]'::jsonb)
  from exigidos e
  join tipos_documento td on td.id = e.tipo_documento_id
  left join atuais a      on a.tipo_documento_id = e.tipo_documento_id
  order by (e.exigencia = 'obrigatorio') desc, td.nome;
$$;

-- ---------------------------------------------------------------
-- Checklist consolidado de TODOS os fornecedores — alimenta o
-- dashboard (KPIs, "ação necessária") e os relatórios com uma
-- única consulta, mantendo o cálculo no Postgres.
-- ---------------------------------------------------------------
create or replace function get_checklist_geral()
returns table (
  fornecedor_id     uuid,
  fornecedor_nome   text,
  status_fornecedor text,
  tipo_documento_id uuid,
  documento_nome    text,
  exigencia         text,
  tem_validade      boolean,
  estado            text,
  data_vencimento   date
)
language sql
stable
security definer set search_path = public
as $$
  with exigidos as (
    select
      fs.fornecedor_id,
      sd.tipo_documento_id,
      case when bool_or(sd.exigencia = 'obrigatorio')
           then 'obrigatorio' else 'condicional' end as exigencia
    from fornecedor_segmentos fs
    join segmento_documentos sd on sd.segmento_id = fs.segmento_id
    group by fs.fornecedor_id, sd.tipo_documento_id
  ),
  atuais as (
    select
      d.fornecedor_id,
      d.tipo_documento_id,
      count(*)::int as qtd,
      bool_or(d.data_vencimento is not null and d.data_vencimento >= current_date) as tem_valido,
      bool_or(d.data_vencimento is null) as tem_sem_data,
      min(d.data_vencimento) filter (where d.data_vencimento >= current_date) as prox_valido,
      max(d.data_vencimento) as max_venc
    from documentos d
    where d.is_atual and d.excluido_em is null
    group by d.fornecedor_id, d.tipo_documento_id
  )
  select
    f.id,
    f.razao_social,
    f.status,
    td.id,
    td.nome,
    e.exigencia,
    td.tem_validade,
    case
      when coalesce(a.qtd, 0) = 0        then 'faltando'
      when not td.tem_validade           then 'ok'
      when coalesce(a.tem_valido, false) then 'ok'
      when coalesce(a.tem_sem_data, false) then 'aguardando'
      else                                    'vencido'
    end,
    coalesce(a.prox_valido, a.max_venc)
  from exigidos e
  join fornecedores f    on f.id = e.fornecedor_id
  join tipos_documento td on td.id = e.tipo_documento_id
  left join atuais a
    on a.fornecedor_id = e.fornecedor_id
   and a.tipo_documento_id = e.tipo_documento_id;
$$;

-- ---------------------------------------------------------------
-- Exclusão (soft delete) de um documento lançado errado.
-- Mantém a linha no banco com quem excluiu, quando e por quê;
-- se era a versão vigente de um tipo single, promove a anterior.
-- ---------------------------------------------------------------
create or replace function excluir_documento(p_documento_id uuid, p_motivo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r       documentos%rowtype;
  v_multi boolean;
begin
  select * into r from documentos where id = p_documento_id;
  if not found then
    raise exception 'Documento não encontrado';
  end if;
  if r.excluido_em is not null then
    return; -- idempotente
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da exclusão';
  end if;

  update documentos
     set excluido_em     = now(),
         excluido_por    = auth.uid(),
         motivo_exclusao = btrim(p_motivo),
         is_atual        = false
   where id = p_documento_id;

  select coalesce(permite_multiplos, false) into v_multi
    from tipos_documento where id = r.tipo_documento_id;

  -- tipo single: a versão anterior volta a ser a vigente
  if r.is_atual and not v_multi then
    update documentos set is_atual = true
     where id = (
       select id from documentos
        where fornecedor_id = r.fornecedor_id
          and tipo_documento_id = r.tipo_documento_id
          and excluido_em is null
          and not is_atual
        order by data_envio desc, created_at desc
        limit 1
     );
  end if;

  perform recalcular_status_fornecedor(r.fornecedor_id);
end;
$$;

-- ---------------------------------------------------------------
-- Grants (mesma política do 0003: nada exposto para anon)
-- ---------------------------------------------------------------
revoke all on function public.trg_documentos_versiona() from public;

revoke all on function public.get_checklist_fornecedor(uuid) from public;
grant execute on function public.get_checklist_fornecedor(uuid) to authenticated;

revoke all on function public.get_checklist_geral() from public;
grant execute on function public.get_checklist_geral() to authenticated;

revoke all on function public.excluir_documento(uuid, text) from public;
grant execute on function public.excluir_documento(uuid, text) to authenticated;
