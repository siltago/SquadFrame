export const STOCK_PERMISSIONS = {
  MOVIMENTACAO_GERENCIAR: "stock.movimentacao.gerenciar",
  LOCAL_GERENCIAR: "stock.local.gerenciar",
  RECEBIMENTO_INICIAR: "stock.recebimento.iniciar",
} as const;

// Migrado de modules/squadframe/lib/permissions.ts junto com o código do
// catálogo (rotas/actions/componentes). Valores string inalterados —
// nenhuma linha de permissoes/cargo_permissoes no banco precisa mudar.
// CATALOGO_FORNECEDOR_* ficou em modules/squadframe/lib/permissions.ts
// porque compras/fornecedores.ts (SquadFrame) também as usa.
export const CATALOGO_PERMISSIONS = {
  EDITAR: "catalogo.editar",
  LINHA_GERENCIAR: "catalogo.linha.gerenciar",
  CATEGORIA_GERENCIAR: "catalogo.categoria.gerenciar",
} as const;
