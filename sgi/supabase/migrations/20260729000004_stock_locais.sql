-- ============================================================
-- SquadStock — rastreio por localização física (Galpão, Filial, etc.),
-- independente de obra. obra_id continua existindo em stock_saldos/
-- stock_movimentacoes como uma segunda dimensão OPCIONAL ("reservado
-- para esta obra"), não mais a dimensão primária — o saldo "geral" do
-- produto passa a ser a soma entre todos os locais e reservas.
--
-- stock_saldos tinha PK (produto_id, obra_id) com obra_id NOT NULL.
-- Agora vira uma linha por (produto_id, local_id, obra_id) com
-- obra_id podendo ser NULL (estoque livre, não reservado). Como
-- UNIQUE/PK não trata NULL como valor comparável, usamos dois índices
-- únicos parciais em vez de uma PK composta — um cobre "com reserva de
-- obra", outro cobre "sem reserva" (mesmo raciocínio de carteiras
-- pooled, adaptado pra chave nula em vez de soma).
-- ============================================================

CREATE TABLE stock_locais (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL UNIQUE,
  tipo       text        NOT NULL DEFAULT 'OUTRO' CHECK (tipo IN ('GALPAO', 'FILIAL', 'OUTRO')),
  ativo      boolean     NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY "authenticated_select" ON stock_locais FOR SELECT TO authenticated USING (true);

-- Destino automático das entradas por recebimento de pedido — ninguém
-- sabe em qual galpão/filial físico o material efetivamente parou até
-- alguém registrar isso; cai aqui por padrão e é realocado depois.
INSERT INTO stock_locais (nome, tipo) VALUES ('Não alocado', 'OUTRO');

-- ---------------------------------------------------------------------------
-- stock_movimentacoes: local_id vira dimensão obrigatória, obra_id vira opcional.
-- ---------------------------------------------------------------------------
ALTER TABLE stock_movimentacoes ADD COLUMN local_id uuid REFERENCES stock_locais(id);
UPDATE stock_movimentacoes SET local_id = (SELECT id FROM stock_locais WHERE nome = 'Não alocado');
ALTER TABLE stock_movimentacoes ALTER COLUMN local_id SET NOT NULL;
ALTER TABLE stock_movimentacoes ALTER COLUMN obra_id DROP NOT NULL;

CREATE INDEX idx_stock_movimentacoes_produto_local ON stock_movimentacoes (produto_id, local_id);

-- ---------------------------------------------------------------------------
-- stock_saldos: troca a PK composta (produto_id, obra_id) por um id
-- substituto + dois índices únicos parciais (produto_id, local_id[, obra_id]).
-- ---------------------------------------------------------------------------
ALTER TABLE stock_saldos DROP CONSTRAINT stock_saldos_pkey;
ALTER TABLE stock_saldos ADD COLUMN id uuid DEFAULT gen_random_uuid();
UPDATE stock_saldos SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE stock_saldos ALTER COLUMN id SET NOT NULL;
ALTER TABLE stock_saldos ADD PRIMARY KEY (id);

ALTER TABLE stock_saldos ADD COLUMN local_id uuid REFERENCES stock_locais(id);
UPDATE stock_saldos SET local_id = (SELECT id FROM stock_locais WHERE nome = 'Não alocado');
ALTER TABLE stock_saldos ALTER COLUMN local_id SET NOT NULL;
ALTER TABLE stock_saldos ALTER COLUMN obra_id DROP NOT NULL;

CREATE UNIQUE INDEX stock_saldos_uniq_com_obra ON stock_saldos (produto_id, local_id, obra_id) WHERE obra_id IS NOT NULL;
CREATE UNIQUE INDEX stock_saldos_uniq_sem_obra ON stock_saldos (produto_id, local_id) WHERE obra_id IS NULL;
CREATE INDEX idx_stock_saldos_produto ON stock_saldos (produto_id);

-- ---------------------------------------------------------------------------
-- Trigger de aplicação de movimentação — agora precisa escolher qual dos
-- dois índices parciais usar como alvo do ON CONFLICT, conforme obra_id
-- vier nulo ou não (Postgres não infere automaticamente entre dois
-- índices parciais concorrentes).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stock_fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  IF NEW.obra_id IS NULL THEN
    INSERT INTO stock_saldos (produto_id, local_id, obra_id, quantidade, atualizado_em)
    VALUES (NEW.produto_id, NEW.local_id, NULL, NEW.quantidade, now())
    ON CONFLICT (produto_id, local_id) WHERE obra_id IS NULL DO UPDATE
      SET quantidade = stock_saldos.quantidade + EXCLUDED.quantidade, atualizado_em = now();
  ELSE
    INSERT INTO stock_saldos (produto_id, local_id, obra_id, quantidade, atualizado_em)
    VALUES (NEW.produto_id, NEW.local_id, NEW.obra_id, NEW.quantidade, now())
    ON CONFLICT (produto_id, local_id, obra_id) WHERE obra_id IS NOT NULL DO UPDATE
      SET quantidade = stock_saldos.quantidade + EXCLUDED.quantidade, atualizado_em = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Entrada automática por recebimento — cai em "Não alocado"; obra_id do
-- pedido é gravado como reserva (pode ser NULL em pedido administrativo,
-- que antes não gerava entrada nenhuma — agora gera, já que obra deixou
-- de ser pré-requisito pra existir saldo).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stock_fn_entrada_por_recebimento() RETURNS trigger AS $$
DECLARE
  v_produto_id uuid;
  v_obra_id uuid;
  v_local_id uuid;
BEGIN
  SELECT pi.produto_id, pc.obra_id INTO v_produto_id, v_obra_id
  FROM pedido_itens pi JOIN pedidos_compra pc ON pc.id = pi.pedido_id
  WHERE pi.id = NEW.pedido_item_id;

  SELECT id INTO v_local_id FROM stock_locais WHERE nome = 'Não alocado';

  IF v_produto_id IS NOT NULL AND v_local_id IS NOT NULL THEN
    INSERT INTO stock_movimentacoes (numero, produto_id, local_id, obra_id, tipo, quantidade, origem_tipo, origem_id)
    VALUES (gerar_numero_movimento_estoque(), v_produto_id, v_local_id, v_obra_id, 'ENTRADA', NEW.quantidade_recebida, 'recebimento_pedido', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('stock.local.gerenciar', 'Criar/editar locais de estoque (galpão, filial)', 'STOCK')
ON CONFLICT (chave) DO NOTHING;
