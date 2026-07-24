-- =============================================================
-- Hardening — fecha as funções SECURITY DEFINER para o público/anon.
-- (Apontado pelo linter de segurança do Supabase após aplicar 0001/0002.)
-- Trigger functions não devem ser chamáveis via API por ninguém;
-- as RPCs usadas pelo app ficam restritas a usuários autenticados.
-- =============================================================

revoke all on function public.handle_new_user() from public;
revoke all on function public.trg_documentos_recalcula() from public;

revoke all on function public.recalcular_status_fornecedor(uuid) from public;
grant execute on function public.recalcular_status_fornecedor(uuid) to authenticated;

revoke all on function public.get_checklist_fornecedor(uuid) from public;
grant execute on function public.get_checklist_fornecedor(uuid) to authenticated;
