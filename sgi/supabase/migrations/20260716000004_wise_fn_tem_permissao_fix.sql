-- ============================================================
-- SquadWise — hotfix: wise_fn_tem_permissao não reconhecia papel
-- is_admin quando o papel não tinha nenhuma linha em
-- wise_papel_permissoes (caso do papel "Administrador" derivado na
-- migração do Bloco 1.3 — is_admin=true não recebe permissões
-- explícitas de propósito). O INNER JOIN direto em
-- wise_papel_permissoes zerava o resultado antes do bypass de admin
-- ser avaliado. Descoberto pelo teste de paridade contra
-- fn_tem_permissao legado (seção 9, Bloco 1.3, critério de aceite).
-- ============================================================

CREATE OR REPLACE FUNCTION wise_fn_tem_permissao(p_usuario_id uuid, p_chave text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM wise_usuario_papeis up
    JOIN wise_papeis p ON p.id = up.papel_id AND p.ativo
    WHERE up.usuario_id = p_usuario_id
      AND (
        p.is_admin
        OR EXISTS (
          SELECT 1
          FROM wise_papel_permissoes pp
          JOIN wise_permissoes perm ON perm.id = pp.permissao_id
          WHERE pp.papel_id = p.id AND perm.chave = p_chave
        )
      )
  );
$$;
