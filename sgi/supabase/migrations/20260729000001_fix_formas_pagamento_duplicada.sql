-- =============================================================================
-- Migration: 20260729000001_fix_formas_pagamento_duplicada.sql
-- "Faturamento Direto" existia em duas linhas em formas_pagamento (mesmo
-- nome/descrição, is_faturamento_direto=true, criadas em datas diferentes).
-- Causa raiz: o seed em 20260629000003_faturamento_direto.sql usa
-- `INSERT ... ON CONFLICT DO NOTHING` sem nenhum índice único em `nome`
-- pra conflitar contra — então nunca foi realmente idempotente, e essa
-- migration acabou sendo reaplicada (o workaround de `migration repair
-- --status reverted` usado neste projeto força re-push de migrations num
-- intervalo de datas a cada `db push`, e 20260629 cai nesse intervalo).
-- =============================================================================

-- 1. Migra pedidos que referenciam a linha duplicada pra linha canônica
--    (a mais antiga, que também é a mais usada) e apaga a duplicata.
DO $$
DECLARE
  v_canonico  uuid;
  v_duplicado uuid;
BEGIN
  SELECT id INTO v_canonico
  FROM formas_pagamento
  WHERE nome = 'Faturamento Direto'
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_canonico IS NULL THEN
    RETURN; -- nada a fazer (linha não existe, ambiente novo)
  END IF;

  FOR v_duplicado IN
    SELECT id FROM formas_pagamento WHERE nome = 'Faturamento Direto' AND id <> v_canonico
  LOOP
    UPDATE pedidos_compra SET forma_pagamento_id = v_canonico WHERE forma_pagamento_id = v_duplicado;
    DELETE FROM formas_pagamento WHERE id = v_duplicado;
  END LOOP;
END;
$$;

-- 2. Impede duplicata de nome daqui pra frente — e faz o ON CONFLICT DO
--    NOTHING do seed original passar a funcionar de verdade (bare ON
--    CONFLICT DO NOTHING casa contra qualquer unique constraint existente).
ALTER TABLE formas_pagamento ADD CONSTRAINT formas_pagamento_nome_key UNIQUE (nome);
