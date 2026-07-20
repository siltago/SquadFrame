export type Criticidade = "BAIXA" | "NORMAL" | "ALTA" | "BLOQUEANTE";

export type EtapaNecessaria =
  | "corte" | "usinagem" | "montagem" | "vedacao" | "vidro" | "embalagem" | "expedicao";

export type WisePacoteCompras = {
  id: string;
  pacote_id: string;
  responsavel_id: string | null;
  bloqueado: boolean;
  motivo_bloqueio: string | null;
  bloqueado_por: string | null;
  bloqueado_em: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type WiseNecessidade = {
  id: string;
  pacote_id: string;
  produto_id: string | null;
  descricao_livre: string | null;
  quantidade_necessaria: number;
  unidade: string;
  criticidade: Criticidade;
  etapa_necessaria: EtapaNecessaria | null;
  estado_administrativo: "ATIVA" | "CANCELADA";
  motivo_cancelamento: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  produto?: { id: string; nome: string; codigo_mestre: string } | null;
};

// Status calculado — nunca persistido (ver seção 13.4 do documento de
// arquitetura). Agora com a cadeia de alocação (Bloco B), a cobertura
// real entra no cálculo — ver calcularStatusSuprimentos em service.ts.
export type StatusSuprimentosCalculado =
  | "SEM_NECESSIDADES"
  | "PENDENTE_DE_COMPRA"
  | "COMPRA_PARCIAL"
  | "PEDIDOS_EMITIDOS"
  | "RECEBIMENTO_PARCIAL"
  | "MATERIAL_RECEBIDO";

export type ResultadoServico<T = undefined> = { ok: true; dados: T } | { ok: false; erro: string };

// ── Alocações (Bloco B) ─────────────────────────────────────

export type AlocacaoSolicitacao = {
  id: string;
  solicitacao_item_id: string;
  necessidade_id: string;
  quantidade_alocada: number;
  estado_administrativo: "ATIVA" | "CANCELADA";
  motivo_cancelamento: string | null;
  criado_em: string;
};

export type AlocacaoPedido = {
  id: string;
  pedido_item_id: string;
  necessidade_id: string;
  solicitacao_item_alocacao_id: string | null;
  quantidade_alocada: number;
  origem_alocacao: "SOLICITACAO" | "COMPRA_DIRETA";
  justificativa_compra_direta: string | null;
  estado_administrativo: "ATIVA" | "CANCELADA";
  motivo_cancelamento: string | null;
  criado_em: string;
};

export type AlocacaoRecebimento = {
  id: string;
  recebimento_item_id: string;
  pedido_item_alocacao_id: string;
  quantidade_alocada: number;
  estado_administrativo: "ATIVA" | "ESTORNADA";
  motivo_estorno: string | null;
  criado_em: string;
};

// Cobertura por necessidade — solicitado/pedido/recebido nunca são
// somados entre si (são níveis diferentes do mesmo funil).
export type CoberturaNecessidade = {
  necessidade_id: string;
  quantidade_necessaria: number;
  solicitado: number;
  pedido: number;
  recebido: number;
};

// Item de pedido vinculado ao pacote (via pedidos_compra.lote_id),
// usado no picker de alocação — mostra só o que ainda não foi
// totalmente alocado a nenhuma necessidade.
export type PedidoItemDisponivel = {
  id: string;
  pedido_id: string;
  pedido_numero: string;
  descricao_snapshot: string;
  quantidade_pedida: number;
  unidade: string;
  ja_alocado: number;
};

// Item de solicitação vinculado ao pacote (via solicitacoes_compra.lote_id).
export type SolicitacaoItemDisponivel = {
  id: string;
  solicitacao_id: string;
  solicitacao_numero: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  ja_alocado: number;
};

// Item de recebimento já vinculado (via alocação de pedido) a uma
// necessidade específica — usado no picker de "alocar recebimento".
// pedido_item_alocacao_id já vem resolvido pra ESTA necessidade.
export type RecebimentoItemDisponivel = {
  id: string;
  recebimento_id: string;
  pedido_numero: string;
  pedido_item_id: string;
  pedido_item_alocacao_id: string;
  quantidade_recebida: number;
  unidade: string;
  ja_alocado: number;
};

// ── Import de necessidades via XML (de-para de código) ───────

export type ItemXmlParaResolver = {
  _key: number;
  origem: "componente" | "perfil";
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  cortesMm: number[];
};

// Item já resolvido automaticamente (código_mestre direto ou alias já
// existente) — não entra na tabela de revisão, vira necessidade direto.
export type ItemXmlResolvido = ItemXmlParaResolver & {
  status: "resolvido";
  produto_id: string;
  produto_codigo_mestre: string;
  produto_nome: string;
  tamanho_mm: number | null;
};

// Item sem match nenhum (nem código_mestre, nem alias, nem ignorado) —
// vai pra tabela de revisão pro usuário decidir.
export type ItemXmlPendente = ItemXmlParaResolver & {
  status: "pendente";
};

export type ResolucaoImportacaoXml = {
  resolvidos: ItemXmlResolvido[];
  pendentes: ItemXmlPendente[];
  // quantos itens do XML já foram marcados como "não incluir" antes —
  // não aparecem nem em resolvidos nem em pendentes, só informativo.
  ignorados: number;
};

// Decisão final do usuário por linha (tanto resolvida automaticamente
// quanto revisada manualmente) — enviada em lote pra confirmarImportacaoXmlAction.
export type DecisaoItemXml = {
  _key: number;
  origem: "componente" | "perfil";
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  cortesMm: number[];
  incluir: boolean;
  // Quando já resolvido (produto existente ou recém-cadastrado nesta
  // sessão de revisão) — precisa criar alias se ainda não existir.
  produto_id: string | null;
  tamanho_mm: number | null;
  // true só quando o usuário resolveu manualmente na tabela (precisa
  // criar alias); false quando já veio resolvido (alias já existe).
  precisa_criar_alias: boolean;
};
