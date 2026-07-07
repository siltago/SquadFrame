-- =============================================================================
-- Migration: 20260707000002_limpar_produto_cores_por_tipo.sql
-- Limpeza de dados: remove vínculos produto_cores que não correspondem ao
-- tipo da linha do produto.
--
-- Causa raiz (corrigida no código nesta mesma leva de mudanças): criarProduto,
-- importarPerfisXml e vincularTodasCores vinculavam automaticamente TODAS as
-- cores RAL a qualquer produto novo, sem filtrar por tipo (perfil recebia cor
-- de vidro, vidro recebia cor de componente, etc). O código já foi corrigido
-- para filtrar por cores_ral.tipos — esta migration só limpa o resíduo que
-- já estava salvo no banco antes da correção.
--
-- Só remove vínculos comprovadamente errados: produto pertence a uma linha
-- com tipo X, e a cor vinculada não tem X em cores_ral.tipos. Não mexe em
-- vínculos corretos.
-- =============================================================================

DO $$
DECLARE
  v_removidos integer;
BEGIN
  DELETE FROM public.produto_cores pc
  USING public.produtos p, public.linhas l, public.cores_ral c
  WHERE pc.produto_id = p.id
    AND p.linha_id = l.id
    AND pc.cor_id = c.id
    AND NOT (c.tipos @> ARRAY[l.tipo]::text[]);

  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  RAISE NOTICE 'produto_cores: % vínculo(s) removido(s) por não corresponder ao tipo da linha do produto.', v_removidos;
END $$;
