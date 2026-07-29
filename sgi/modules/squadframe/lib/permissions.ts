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

  // Fornecedores (catálogo — migrado de compras). Mantidas aqui (não em
  // modules/squadstock/constants) porque compras/fornecedores.ts, que
  // continua no SquadFrame, também as usa — ver CATALOGO_PERMISSIONS em
  // modules/squadstock/constants para as chaves exclusivas do módulo de
  // catálogo (EDITAR/LINHA_GERENCIAR/CATEGORIA_GERENCIAR), que migraram
  // junto com o código do catálogo para o SquadStock.
  CATALOGO_FORNECEDOR_CRIAR:   "catalogo.fornecedor.criar",
  CATALOGO_FORNECEDOR_EDITAR:  "catalogo.fornecedor.editar",
  CATALOGO_FORNECEDOR_EXCLUIR: "catalogo.fornecedor.excluir",

  // Obras (já existente no sistema)
  OBRAS_CRIAR: "obras.criar",
  OBRAS_EDITAR: "obras.editar",

  // Financeiro — carteiras e faturamento direto. usa_carteira em pedidos_compra
  // é sempre derivado de formas_pagamento.is_faturamento_direto (ver
  // derivarUsaCarteira em modules/squadframe/actions/compras/helpers.ts) —
  // não existe mais um toggle manual/permissão própria pra isso. Depósito
  // manual em carteira também não existe mais — carteira só é financiada via
  // contrato (financeiro.contrato.gerenciar, ver criar_contrato_alocacao).
  FINANCEIRO_CARTEIRA_VER:       "financeiro.carteira.ver",
  FINANCEIRO_PEDIDO_CONFIRMAR_DEBITO: "financeiro.pedido.confirmar_debito",
  FINANCEIRO_DASHBOARD_VER:      "financeiro.dashboard.ver",
  FINANCEIRO_CONTRATO_GERENCIAR: "financeiro.contrato.gerenciar",

  // Retorno e Devolução de Pedido
  COMPRAS_PEDIDO_RETORNAR:          "compras.pedido.retornar",
  COMPRAS_PEDIDO_APROVAR_RETORNO:   "compras.pedido.aprovar_retorno",
  COMPRAS_PEDIDO_DEVOLVER:          "compras.pedido.devolver",
  COMPRAS_PEDIDO_APROVAR_DEVOLUCAO: "compras.pedido.aprovar_devolucao",

  // Contexto de Compras do Pacote de Trabalho (necessidades de material)
  FRAME_PACOTES_COMPRAS_VISUALIZAR: "frame.pacotes.compras.visualizar",
  FRAME_PACOTES_COMPRAS_GERENCIAR:  "frame.pacotes.compras.gerenciar",

  // Documentos / Relatórios
  COMPRAS_RELATORIO_GERENCIAR: "compras.relatorio.gerenciar",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
