-- Correção: REVOKE ... FROM PUBLIC não bloqueia anon/authenticated
-- quando o Supabase concede EXECUTE a esses papéis diretamente via
-- ALTER DEFAULT PRIVILEGES (não via PUBLIC) na criação da função.
-- Confirmado em teste: a RPC sistêmica (sem checagem de permissão,
-- pensada só pra ser chamada via service_role a partir do backend)
-- estava de fato alcançável com a anon key.
REVOKE ALL ON FUNCTION fn_frame_ensure_package_procurement_context_system(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_frame_ensure_package_procurement_context_system(uuid) TO service_role;
