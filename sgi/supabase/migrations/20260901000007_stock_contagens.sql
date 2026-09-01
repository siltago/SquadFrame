-- Fase 2 do mapa de estoque: sessões de contagem cíclica. Escopo é um
-- nó da árvore (stock_locais) + filtros opcionais de tipo/linha/produto.
-- Modo PAPEL (imprime, confere manual, digita o resultado depois,
-- anexa foto do papel conferido) ou SISTEMA (conta direto na tela).
-- Reconciliação (concluirContagem, na camada de aplicação) reaproveita
-- exatamente o insert de AJUSTE que já existe em registrarAjuste() —
-- rastreado via origem_tipo='contagem' + origem_id=contagem.id, colunas
-- que já existiam em stock_movimentacoes antes desta migration.

CREATE SEQUENCE stock_contagem_numero_seq START 1;
CREATE FUNCTION gerar_numero_contagem_estoque() RETURNS text LANGUAGE sql AS $$
  SELECT 'CNT-' || nextval('stock_contagem_numero_seq')::text;
$$;

CREATE TABLE stock_contagens (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             text        NOT NULL UNIQUE,
  local_raiz_id      uuid        NOT NULL REFERENCES stock_locais(id),
  filtro_tipo        text,
  filtro_linha_id    uuid        REFERENCES linhas(id),
  filtro_produto_id  uuid        REFERENCES produtos(id),
  modo               text        NOT NULL CHECK (modo IN ('PAPEL', 'SISTEMA')),
  status             text        NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'EM_CONTAGEM', 'CONCLUIDA', 'CANCELADA')),
  foto_comprovante_url text,
  criado_por         uuid        REFERENCES usuarios(id),
  criado_em          timestamptz NOT NULL DEFAULT now(),
  concluido_em       timestamptz
);

CREATE TABLE stock_contagem_itens (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contagem_id         uuid        NOT NULL REFERENCES stock_contagens(id) ON DELETE CASCADE,
  produto_id          uuid        NOT NULL REFERENCES produtos(id),
  local_id            uuid        NOT NULL REFERENCES stock_locais(id),
  obra_id             uuid        REFERENCES obras(id),
  cor_id              uuid        REFERENCES cores_ral(id),
  quantidade_esperada numeric(12,3) NOT NULL DEFAULT 0,
  quantidade_contada  numeric(12,3),
  contado_em          timestamptz,
  contado_por         uuid        REFERENCES usuarios(id)
);

CREATE INDEX idx_stock_contagem_itens_contagem ON stock_contagem_itens (contagem_id);
CREATE INDEX idx_stock_contagens_local_raiz ON stock_contagens (local_raiz_id);
CREATE INDEX idx_stock_contagens_status ON stock_contagens (status);

ALTER TABLE stock_contagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_contagem_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON stock_contagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select" ON stock_contagem_itens FOR SELECT TO authenticated USING (true);

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('stock.contagem.gerenciar', 'Gerenciar contagens de estoque', 'STOCK')
ON CONFLICT (chave) DO NOTHING;
