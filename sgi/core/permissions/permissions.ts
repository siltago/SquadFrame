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

  // Fornecedores
  COMPRAS_FORNECEDOR_CRIAR:   "compras.fornecedor.criar",
  COMPRAS_FORNECEDOR_EDITAR:  "compras.fornecedor.editar",
  COMPRAS_FORNECEDOR_EXCLUIR: "compras.fornecedor.excluir",

  // Obras (já existente no sistema)
  OBRAS_CRIAR: "obras.criar",
  OBRAS_EDITAR: "obras.editar",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
