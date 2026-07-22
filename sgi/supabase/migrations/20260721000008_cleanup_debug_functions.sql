-- Remove funções de debug criadas durante a investigação do bug de RLS em
-- notificacoes/usuarios (não fazem parte do schema da aplicação).
DROP FUNCTION IF EXISTS _debug_check_notif_policy();
DROP FUNCTION IF EXISTS _debug_check_notif_grants();
DROP FUNCTION IF EXISTS _debug_auth_uid();
DROP FUNCTION IF EXISTS _debug_check_usuarios_rls();
