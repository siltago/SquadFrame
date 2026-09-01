-- Fase 1 do mapa de estoque: stock_locais vira uma árvore (galpão > sala
-- > corredor > prateleira > nível...). Baixo risco — hoje só existe uma
-- linha real ("Não alocado"), então não há dado complexo pra migrar.
--
-- nivel_tipo é texto livre (não um CHECK enum) porque o nome de cada
-- nível é definido pelo usuário, não uma taxonomia fixa do sistema
-- (diferente de wise_obra_estrutura.tipo, que é um enum de 5 valores —
-- não copiado aqui de propósito).
--
-- "Não alocado" fica marcado especial=true: continua recebendo entrada
-- automática do trigger stock_fn_entrada_por_recebimento (intocado),
-- mas fica fora da árvore visual e do rollup de sugestão de contagem.

ALTER TABLE stock_locais
  ADD COLUMN parent_id  uuid REFERENCES stock_locais(id) ON DELETE RESTRICT,
  ADD COLUMN nivel_tipo text,
  ADD COLUMN ordem      integer NOT NULL DEFAULT 0,
  ADD COLUMN codigo     text,
  ADD COLUMN especial   boolean NOT NULL DEFAULT false;

UPDATE stock_locais SET especial = true WHERE nome = 'Não alocado';

CREATE INDEX idx_stock_locais_parent ON stock_locais (parent_id);

-- A UNIQUE(nome) original travava o sistema inteiro num único nome —
-- inviável numa árvore (duas prateleiras diferentes vão ter "Nível 1").
-- Troca por unicidade só entre irmãos (mesmo parent_id), incluindo os
-- nós de raiz (parent_id NULL agrupados juntos via COALESCE).
ALTER TABLE stock_locais DROP CONSTRAINT stock_locais_nome_key;
CREATE UNIQUE INDEX stock_locais_nome_por_pai
  ON stock_locais (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), nome);

-- Permissão nova pro gerenciamento do mapa — chave própria em vez de
-- reaproveitar stock.local.gerenciar, já que a árvore é uma
-- responsabilidade bem maior que o CRUD flat que existia antes.
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('stock.mapa.gerenciar', 'Gerenciar mapa de estoque (locais, árvore)', 'STOCK')
ON CONFLICT (chave) DO NOTHING;
