-- =============================================================================
-- Migration: 20260707000001_produto_aliases_cor.sql
-- Catálogo: variação de código por cor dentro do mesmo fornecedor.
--
-- Hoje um alias (produto_aliases) representa "o código deste produto neste
-- fornecedor" — 1 alias por (produto, fornecedor). Isso não cobre o caso de
-- componentes cujo código muda por cor mesmo dentro de UM ÚNICO fornecedor
-- (ex: FEC325PTR para preto, FEC325BRC para branco, mesmo fornecedor).
--
-- Aditiva: adiciona cor_id opcional em produto_aliases. Aliases existentes
-- ficam com cor_id NULL (== "vale para qualquer cor", comportamento idêntico
-- ao atual). Não altera nenhuma linha existente nem quebra a leitura atual
-- de produto_aliases em nenhum lugar do sistema.
-- =============================================================================

ALTER TABLE public.produto_aliases
  ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES public.cores_ral(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produto_aliases_cor_id
  ON public.produto_aliases (cor_id) WHERE cor_id IS NOT NULL;

-- Evita duas linhas ambíguas para a mesma combinação produto+fornecedor+cor.
-- NULL é tratado como valor distinto pelo Postgres em índices únicos, então
-- isso não restringe em nada os aliases sem cor definida (comportamento
-- atual, múltiplos aliases por produto+fornecedor sem cor continuam livres).
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_aliases_unico_por_cor
  ON public.produto_aliases (produto_id, fornecedor_id, cor_id)
  WHERE cor_id IS NOT NULL;

COMMENT ON COLUMN public.produto_aliases.cor_id IS
  'Cor (cores_ral) à qual este código de fornecedor se refere. NULL = alias vale para qualquer cor (comportamento anterior a esta migration).';
