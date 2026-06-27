import "server-only";

export const PERMISSIONS = {
  // Solicitações
  COMPRAS_SOLICITACAO_CRIAR:    "compras.solicitacao.criar",
  COMPRAS_SOLICITACAO_APROVAR:  "compras.solicitacao.aprovar",
  COMPRAS_SOLICITACAO_REJEITAR: "compras.solicitacao.rejeitar",

  // Pedidos
  COMPRAS_PEDIDO_CRIAR:    "compras.pedido.criar",
  COMPRAS_PEDIDO_APROVAR:  "compras.pedido.aprovar",
  COMPRAS_PEDIDO_CANCELAR: "compras.pedido.cancelar",
  COMPRAS_PEDIDO_EXCLUIR:  "compras.pedido.excluir",

  // Recebimentos
  COMPRAS_RECEBIMENTO_REGISTRAR: "compras.recebimento.registrar",

  // Documentos de pedido
  COMPRAS_DOCUMENTO_UPLOAD:  "compras.documento.upload",
  COMPRAS_DOCUMENTO_EXCLUIR: "compras.documento.excluir",

  // Anotações de pedido
  COMPRAS_ANOTACAO_CRIAR: "compras.anotacao.criar",

  // Formas de pagamento
  COMPRAS_FORMA_PAGAMENTO_GERENCIAR: "compras.formapagamento.gerenciar",

  // Fornecedores (compras — mantido para compatibilidade)
  COMPRAS_FORNECEDOR_CRIAR:   "compras.fornecedor.criar",
  COMPRAS_FORNECEDOR_EDITAR:  "compras.fornecedor.editar",
  COMPRAS_FORNECEDOR_EXCLUIR: "compras.fornecedor.excluir",

  // Fornecedores (catálogo — migrado de compras)
  CATALOGO_FORNECEDOR_CRIAR:   "catalogo.fornecedor.criar",
  CATALOGO_FORNECEDOR_EDITAR:  "catalogo.fornecedor.editar",
  CATALOGO_FORNECEDOR_EXCLUIR: "catalogo.fornecedor.excluir",

  // Linhas e categorias (catálogo)
  CATALOGO_LINHA_GERENCIAR:     "catalogo.linha.gerenciar",
  CATALOGO_CATEGORIA_GERENCIAR: "catalogo.categoria.gerenciar",

  // Obras (já existente no sistema)
  OBRAS_CRIAR: "obras.criar",
  OBRAS_EDITAR: "obras.editar",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
