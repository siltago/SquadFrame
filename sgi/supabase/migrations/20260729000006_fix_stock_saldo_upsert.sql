-- ============================================================
-- Corrige um bug pré-existente (já presente antes desta sessão, no
-- ON CONFLICT original de stock_fn_aplicar_movimentacao — não foi
-- introduzido pela migration de locais): Postgres valida o CHECK
-- constraint (quantidade >= 0) contra a linha BRUTA do INSERT antes
-- de resolver o ON CONFLICT pra UPDATE. Isso significa que qualquer
-- SAÍDA ou AJUSTE negativo contra um saldo já existente falhava
-- sempre com "violates check constraint", mesmo quando o resultado
-- final (saldo_atual + delta) seria perfeitamente válido — reproduzido
-- e confirmado isoladamente fora do trigger, com e sem a mudança de
-- locais, então é um bug do fluxo de estoque desde sempre, não desta
-- migration.
--
-- Troca ON CONFLICT por UPDATE-depois-INSERT-se-não-achou: o UPDATE
-- calcula quantidade + NEW.quantidade e só ele passa pelo CHECK — a
-- linha bruta (potencialmente negativa) nunca é inserida sozinha.
-- `obra_id IS NOT DISTINCT FROM NEW.obra_id` casa tanto NULL=NULL
-- quanto valor=valor numa condição só, sem precisar branch IF/ELSE.
-- ============================================================

CREATE OR REPLACE FUNCTION stock_fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  UPDATE stock_saldos
  SET quantidade = quantidade + NEW.quantidade, atualizado_em = now()
  WHERE produto_id = NEW.produto_id
    AND local_id = NEW.local_id
    AND obra_id IS NOT DISTINCT FROM NEW.obra_id;

  IF NOT FOUND THEN
    INSERT INTO stock_saldos (produto_id, local_id, obra_id, quantidade, atualizado_em)
    VALUES (NEW.produto_id, NEW.local_id, NEW.obra_id, NEW.quantidade, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS debug_exec(text);
DROP FUNCTION IF EXISTS debug_exec_void(text);
