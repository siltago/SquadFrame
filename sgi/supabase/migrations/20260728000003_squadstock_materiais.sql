-- ============================================================
-- SquadStock v1 — saldo e consumo de materiais por obra.
-- Livro-razão (stock_movimentacoes, nunca UPDATE, só INSERT) + read-model
-- materializado (stock_saldos, mantido por trigger). Saldo é por obra
-- (obra_id NOT NULL) — mesmo padrão já usado por carteiras
-- (UNIQUE(obra_id, fornecedor_id)): material é carimbado pra uma obra
-- desde a compra, não existe pool único da empresa nesta v1.
-- ============================================================

CREATE TABLE stock_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  produto_id uuid NOT NULL REFERENCES produtos(id),
  obra_id uuid NOT NULL REFERENCES obras(id),
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
  quantidade numeric(12,3) NOT NULL CHECK (quantidade <> 0), -- sinal já embutido (SAIDA e AJUSTE negativo vêm negativos)
  origem_tipo text,        -- 'recebimento_pedido' | 'manual'
  origem_id uuid,           -- recebimento_itens.id quando origem_tipo = 'recebimento_pedido'
  observacoes text,
  usuario_id uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movimentacoes_produto_obra ON stock_movimentacoes (produto_id, obra_id);
CREATE INDEX idx_stock_movimentacoes_obra_criado ON stock_movimentacoes (obra_id, criado_em DESC);

-- Read-model — nunca editado direto, só pelo trigger abaixo.
CREATE TABLE stock_saldos (
  produto_id uuid NOT NULL REFERENCES produtos(id),
  obra_id uuid NOT NULL REFERENCES obras(id),
  quantidade numeric(12,3) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (produto_id, obra_id)
);

CREATE POLICY "authenticated_select" ON stock_movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON stock_saldos FOR SELECT TO authenticated USING (true);

-- Numeração sequencial — mesmo padrão de gerar_numero_pedido.
CREATE SEQUENCE stock_movimento_numero_seq START 1;
CREATE FUNCTION gerar_numero_movimento_estoque() RETURNS text LANGUAGE sql AS $$
  SELECT nextval('stock_movimento_numero_seq')::text;
$$;

-- Trigger que mantém stock_saldos sincronizado — mesmo estilo de
-- fn_recalcular_status_pedido (recalcula dentro da mesma transação do
-- evento que originou a movimentação).
CREATE FUNCTION stock_fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  INSERT INTO stock_saldos (produto_id, obra_id, quantidade, atualizado_em)
  VALUES (NEW.produto_id, NEW.obra_id, NEW.quantidade, now())
  ON CONFLICT (produto_id, obra_id) DO UPDATE
    SET quantidade = stock_saldos.quantidade + EXCLUDED.quantidade, atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stock_aplicar_movimentacao
AFTER INSERT ON stock_movimentacoes
FOR EACH ROW EXECUTE FUNCTION stock_fn_aplicar_movimentacao();

-- Gancho automático: todo recebimento de pedido já dá entrada no estoque
-- do material recebido, sem precisar de tela nenhuma pra isso. Pedido
-- administrativo sem obra_id não gera entrada (nada pra creditar).
CREATE FUNCTION stock_fn_entrada_por_recebimento() RETURNS trigger AS $$
DECLARE
  v_produto_id uuid;
  v_obra_id uuid;
BEGIN
  SELECT pi.produto_id, pc.obra_id INTO v_produto_id, v_obra_id
  FROM pedido_itens pi JOIN pedidos_compra pc ON pc.id = pi.pedido_id
  WHERE pi.id = NEW.pedido_item_id;

  IF v_produto_id IS NOT NULL AND v_obra_id IS NOT NULL THEN
    INSERT INTO stock_movimentacoes (numero, produto_id, obra_id, tipo, quantidade, origem_tipo, origem_id)
    VALUES (gerar_numero_movimento_estoque(), v_produto_id, v_obra_id, 'ENTRADA', NEW.quantidade_recebida, 'recebimento_pedido', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stock_entrada_por_recebimento
AFTER INSERT ON recebimento_itens
FOR EACH ROW EXECUTE FUNCTION stock_fn_entrada_por_recebimento();

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('stock.movimentacao.gerenciar', 'Registrar saída/ajuste de estoque', 'STOCK')
ON CONFLICT (chave) DO NOTHING;
