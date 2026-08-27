// Limiares do gate de conformidade progressivo — ponto de partida,
// ajustável sem tocar em lógica. Usado tanto pelo banner de pendências
// (severidade visual) quanto pelo gate real (verificar-bloqueio.ts). Sem
// "server-only" de propósito: é importado no client pra colorir a UI.
export const LIMIAR_DIAS_ALERTA_SIMPLES = 1;      // até aqui: alerta normal
export const LIMIAR_DIAS_MODAL_OBRIGATORIO = 2;   // 2–3 dias: modal obrigatório
export const LIMIAR_DIAS_BLOQUEIA_CRIACAO = 3;    // >3 dias OU prazo vencido: bloqueia criar/enviar aprovação
export const LIMIAR_DIAS_BLOQUEIA_EMISSAO = 5;    // >5 dias: bloqueia emitir + escala ao gestor

export type NivelSeveridade = "NORMAL" | "ATENCAO" | "BLOQUEIO_CRIACAO" | "BLOQUEIO_EMISSAO";

export function calcularSeveridade(diasEmAberto: number, prazoVencido: boolean): NivelSeveridade {
  if (diasEmAberto > LIMIAR_DIAS_BLOQUEIA_EMISSAO) return "BLOQUEIO_EMISSAO";
  if (diasEmAberto > LIMIAR_DIAS_BLOQUEIA_CRIACAO || prazoVencido) return "BLOQUEIO_CRIACAO";
  if (diasEmAberto >= LIMIAR_DIAS_MODAL_OBRIGATORIO) return "ATENCAO";
  return "NORMAL";
}

export type AcaoCompras =
  | "criar_pedido"
  | "enviar_pedido_aprovacao"
  | "emitir_pedido"
  | "criar_solicitacao"
  | "enviar_solicitacao_aprovacao";

// Quais níveis de severidade bloqueiam cada ação. "emitir_pedido" só é
// bloqueada no nível mais grave (>5 dias) — criar/enviar já bloqueiam a
// partir de "BLOQUEIO_CRIACAO" (>3 dias ou prazo vencido).
export const NIVEL_MINIMO_PARA_BLOQUEAR_ACAO: Record<AcaoCompras, NivelSeveridade[]> = {
  criar_pedido:                 ["BLOQUEIO_CRIACAO", "BLOQUEIO_EMISSAO"],
  criar_solicitacao:            ["BLOQUEIO_CRIACAO", "BLOQUEIO_EMISSAO"],
  enviar_pedido_aprovacao:      ["BLOQUEIO_CRIACAO", "BLOQUEIO_EMISSAO"],
  enviar_solicitacao_aprovacao: ["BLOQUEIO_CRIACAO", "BLOQUEIO_EMISSAO"],
  emitir_pedido:                ["BLOQUEIO_EMISSAO"],
};

export const MOTIVO_PENDENCIA_LABEL: Record<string, string> = {
  FORNECEDOR_ATRASOU: "Fornecedor atrasou",
  AGUARDANDO_FINANCEIRO: "Aguardando financeiro",
  ERRO_CADASTRAL: "Erro cadastral",
  AGUARDANDO_APROVACAO_INTERNA: "Aguardando aprovação interna",
  PROBLEMA_LOGISTICO: "Problema logístico",
  OUTRO: "Outro",
};
