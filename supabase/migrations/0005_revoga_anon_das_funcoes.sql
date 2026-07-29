-- =============================================================
-- 0005 — Correção de segurança nos grants das funções.
--
-- O `revoke ... from public` das migrations 0003/0004 NÃO era suficiente:
-- o Supabase concede EXECUTE explicitamente ao papel `anon` via default
-- privileges do schema public. Na prática, um visitante não autenticado
-- conseguia chamar `get_checklist_geral` (lendo o checklist de todos os
-- fornecedores) e até `excluir_documento`. Aqui revogamos do papel.
-- =============================================================

revoke execute on function public.get_checklist_fornecedor(uuid)      from anon;
revoke execute on function public.get_checklist_geral()               from anon;
revoke execute on function public.excluir_documento(uuid, text)       from anon;
revoke execute on function public.recalcular_status_fornecedor(uuid)  from anon;

-- Trigger functions não devem ser chamáveis pela API por ninguém.
revoke execute on function public.trg_documentos_versiona()  from anon, authenticated;
revoke execute on function public.trg_documentos_recalcula() from anon, authenticated;
revoke execute on function public.handle_new_user()          from anon, authenticated;

-- Garante o acesso que o app precisa.
grant execute on function public.get_checklist_fornecedor(uuid)     to authenticated;
grant execute on function public.get_checklist_geral()              to authenticated;
grant execute on function public.excluir_documento(uuid, text)      to authenticated;
grant execute on function public.recalcular_status_fornecedor(uuid) to authenticated;
