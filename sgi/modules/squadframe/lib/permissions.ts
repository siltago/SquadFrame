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

  // Notificações WhatsApp
  COMPRAS_NOTIFICACAO_RELATORIO_DIARIO: "compras.notificacao.relatorio_diario",

  // Fornecedores (compras — mantido para compatibilidade)
  COMPRAS_FORNECEDOR_CRIAR:   "compras.fornecedor.criar",
  COMPRAS_FORNECEDOR_EDITAR:  "compras.fornecedor.editar",
  COMPRAS_FORNECEDOR_EXCLUIR: "compras.fornecedor.excluir",

  // Fornecedores (catálogo — migrado de compras)
  CATALOGO_FORNECEDOR_CRIAR:   "catalogo.fornecedor.criar",
  CATALOGO_FORNECEDOR_EDITAR:  "catalogo.fornecedor.editar",
  CATALOGO_FORNECEDOR_EXCLUIR: "catalogo.fornecedor.excluir",

  // Catálogo — edição geral (produtos, arquivos, cores, aliases, specs)
  CATALOGO_EDITAR: "catalogo.editar",

  // Linhas e categorias (catálogo)
  CATALOGO_LINHA_GERENCIAR:     "catalogo.linha.gerenciar",
  CATALOGO_CATEGORIA_GERENCIAR: "catalogo.categoria.gerenciar",

  // Obras (já existente no sistema)
  OBRAS_CRIAR: "obras.criar",
  OBRAS_EDITAR: "obras.editar",

  // Financeiro — carteiras e faturamento direto
  FINANCEIRO_CARTEIRA_VER:       "financeiro.carteira.ver",
  FINANCEIRO_CARTEIRA_DEPOSITAR: "financeiro.carteira.depositar",
  FINANCEIRO_PEDIDO_FAT_DIRETO:  "financeiro.pedido.faturamento_direto.usar",
  FINANCEIRO_PEDIDO_CONFIRMAR_DEBITO: "financeiro.pedido.confirmar_debito",
  FINANCEIRO_DASHBOARD_VER:      "financeiro.dashboard.ver",

  // Retorno e Devolução de Pedido
  COMPRAS_PEDIDO_RETORNAR:          "compras.pedido.retornar",
  COMPRAS_PEDIDO_APROVAR_RETORNO:   "compras.pedido.aprovar_retorno",
  COMPRAS_PEDIDO_DEVOLVER:          "compras.pedido.devolver",
  COMPRAS_PEDIDO_APROVAR_DEVOLUCAO: "compras.pedido.aprovar_devolucao",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
