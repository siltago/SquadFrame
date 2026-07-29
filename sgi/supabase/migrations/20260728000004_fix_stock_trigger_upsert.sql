-- Fix: `INSERT ... ON CONFLICT DO UPDATE` no Postgres valida o CHECK
-- constraint contra a linha candidata BRUTA do INSERT (NEW.quantidade,
-- que pode ser negativa numa SAIDA) antes mesmo de saber que vai cair no
-- conflito — não contra o resultado final da soma. Isso fazia qualquer
-- SAIDA falhar com "violates check constraint stock_saldos_quantidade_check"
-- mesmo com saldo suficiente (ex: saldo=8, saída=1 → falha, porque a linha
-- candidata bruta é -1, que reprova o CHECK antes do conflito ser resolvido).
-- Corrigido pra um upsert manual: UPDATE primeiro (que já calcula e valida
-- só o valor final), INSERT apenas se a linha ainda não existir.
CREATE OR REPLACE FUNCTION stock_fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  UPDATE stock_saldos
  SET quantidade = quantidade + NEW.quantidade, atualizado_em = now()
  WHERE produto_id = NEW.produto_id AND obra_id = NEW.obra_id;

  IF NOT FOUND THEN
    INSERT INTO stock_saldos (produto_id, obra_id, quantidade, atualizado_em)
    VALUES (NEW.produto_id, NEW.obra_id, NEW.quantidade, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
