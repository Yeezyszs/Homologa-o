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
