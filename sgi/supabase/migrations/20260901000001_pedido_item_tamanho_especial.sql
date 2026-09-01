-- Comprimento especial por item de pedido (barra fora do padrão
-- cadastrado no produto). Nullable, sem default: null = comportamento
-- atual (usa produto.tamanho_mm). Não mexe em nenhuma linha existente.
alter table public.pedido_itens
  add column if not exists tamanho_mm_especial numeric(10, 2);

comment on column public.pedido_itens.tamanho_mm_especial is
  'Comprimento em mm específico deste item, quando difere do padrão cadastrado no produto (produtos.tamanho_mm). Null = usa o padrão do produto.';
