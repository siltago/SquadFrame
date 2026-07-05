// Arquitetura genérica de relacionamentos.
// Todo Card pode vincular-se a qualquer entidade do SquadSystem.
// Novos tipos são adicionados aqui sem alterar o schema do banco.

export type EntityType =
  | "WORK_PACKAGE"
  | "OBRA"
  | "PEDIDO_COMPRA"
  | "SOLICITACAO_COMPRA"
  | "FORNECEDOR"
  | "CLIENTE"
  | "USUARIO";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  WORK_PACKAGE: "Pacote de Trabalho",
  OBRA: "Obra",
  PEDIDO_COMPRA: "Pedido de Compra",
  SOLICITACAO_COMPRA: "Solicitação de Compra",
  FORNECEDOR: "Fornecedor",
  CLIENTE: "Cliente",
  USUARIO: "Usuário",
};

export type CardEntityLink = {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityLabel?: string; // desnormalizado para exibição rápida
  criadoEm: string;
};
