// ============================================================
// Activity — Modelo de apresentação do Workspace da Obra
// ============================================================
// NÃO é uma tabela. NÃO é persistido. NÃO é sincronizado.
// É apenas a camada de normalização entre os módulos e o Workspace.
//
// Para adicionar um novo módulo ao Workspace:
//   1. Crie um mapper: minhaEntidade[] → Activity[]
//   2. Adicione a query no workspace-tab.tsx
//   3. Combine com [...existentes, ...novas] antes de renderizar
//   O Workspace não precisa saber que o módulo existe.
// ============================================================

export type ActivityTipo = "pedido" | "solicitacao" | "tarefa" | "producao";

export type ActivityClassificacao =
  | "atencao"      // exige ação humana imediata
  | "em_andamento" // em execução, sem bloqueio
  | "concluido";   // finalizado (recente ou histórico)

export type ActivityPrioridade = "critica" | "alta" | "media" | "baixa";

export type ActivityRelacionamento = {
  tipo: ActivityTipo;
  label: string; // "PC-088", "SC-12", etc.
  href: string;
  // activityId: string — preenchível no futuro quando ambos estiverem no mesmo conjunto
};

export type Activity = {
  id: string;
  tipo: ActivityTipo;
  titulo: string;
  subtitulo?: string;
  status: string;
  statusLabel: string;
  statusCor: string;
  classificacao: ActivityClassificacao;
  prioridade: ActivityPrioridade;
  responsavel?: string;
  ultimaMovimentacao: Date;
  href: string;
  origem: string;    // "Pedido", "Solicitação", "Tarefa", "Produção"
  icone: string;     // "PC", "SC", "T", "P" — texto curto para o badge visual
  corBorda: string;  // classe Tailwind para border-left do card
  corIcone: string;  // classe Tailwind para bg do badge
  // Relacionamentos: SC → PC, PC → Produção, etc.
  // Populado quando a query tiver dados suficientes para cruzar
  relacionamentos: ActivityRelacionamento[];
};

// ── Helpers internos ─────────────────────────────────────────

const DIAS = (d: string | null | undefined): number =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;

// ── Status labels e cores (definidos aqui para evitar acoplamento com @/modules/squadframe/types/compras) ──

const PED_LABEL: Record<string, string> = {
  RASCUNHO:               "Rascunho",
  AGUARDANDO_APROVACAO:   "Aguard. Aprovação",
  APROVADO:               "Aprovado",
  AGUARDANDO_RECEBIMENTO: "Em Trânsito",
  RECEBIDO_PARCIAL:       "Recebido Parcial",
  RECEBIDO:               "Recebido",
  FINALIZADO:             "Finalizado",
  CANCELADO:              "Cancelado",
};
const PED_COR: Record<string, string> = {
  RASCUNHO:               "#94a3b8",
  AGUARDANDO_APROVACAO:   "#f59e0b",
  APROVADO:               "#3b82f6",
  AGUARDANDO_RECEBIMENTO: "#8b5cf6",
  RECEBIDO_PARCIAL:       "#06b6d4",
  RECEBIDO:               "#10b981",
  FINALIZADO:             "#10b981",
  CANCELADO:              "#ef4444",
};

const SOL_LABEL: Record<string, string> = {
  ABERTA:               "Aberta",
  AGUARDANDO_APROVACAO: "Aguard. Aprovação",
  APROVADA:             "Aprovada",
  EM_PEDIDO:            "Em Pedido",
  REJEITADA:            "Rejeitada",
  CANCELADA:            "Cancelada",
};
const SOL_COR: Record<string, string> = {
  ABERTA:               "#64748b",
  AGUARDANDO_APROVACAO: "#f59e0b",
  APROVADA:             "#3b82f6",
  EM_PEDIDO:            "#8b5cf6",
  REJEITADA:            "#ef4444",
  CANCELADA:            "#94a3b8",
};

const TAR_LABEL: Record<string, string> = {
  SEM_DONO:     "Sem dono",
  ACEITA:       "Aceita",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO:   "Aguardando",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
};
const TAR_COR: Record<string, string> = {
  SEM_DONO:     "#94a3b8",
  ACEITA:       "#3b82f6",
  EM_ANDAMENTO: "#f59e0b",
  AGUARDANDO:   "#8b5cf6",
  CONCLUIDA:    "#10b981",
  CANCELADA:    "#ef4444",
};

const PROD_LABEL: Record<string, string> = {
  pendente:    "Pendente",
  em_producao: "Em produção",
  pronto:      "Pronto",
  entregue:    "Entregue",
};
const PROD_COR: Record<string, string> = {
  pendente:    "#94a3b8",
  em_producao: "#f59e0b",
  pronto:      "#10b981",
  entregue:    "#10b981",
};

// ── Classificação operacional ─────────────────────────────────

function classificarPedido(status: string, diasSemMovimento: number): ActivityClassificacao {
  if (["RECEBIDO", "FINALIZADO", "CANCELADO"].includes(status)) return "concluido";
  if (status === "AGUARDANDO_APROVACAO") return "atencao";
  return "em_andamento";
}

function prioridadePedido(status: string, diasSemMovimento: number): ActivityPrioridade {
  if (status !== "AGUARDANDO_APROVACAO") return "baixa";
  if (diasSemMovimento >= 5) return "critica";
  if (diasSemMovimento >= 3) return "alta";
  if (diasSemMovimento >= 1) return "media";
  return "baixa";
}

function classificarSolicitacao(status: string): ActivityClassificacao {
  if (["CANCELADA"].includes(status)) return "concluido";
  if (["ABERTA", "AGUARDANDO_APROVACAO", "REJEITADA"].includes(status)) return "atencao";
  return "em_andamento"; // APROVADA, EM_PEDIDO
}

function prioridadeSolicitacao(status: string, diasSemMovimento: number): ActivityPrioridade {
  if (status === "REJEITADA") return "alta";
  if (status === "ABERTA" && diasSemMovimento >= 7) return "critica";
  if (status === "AGUARDANDO_APROVACAO" && diasSemMovimento >= 5) return "alta";
  if (["ABERTA", "AGUARDANDO_APROVACAO"].includes(status) && diasSemMovimento >= 3) return "media";
  return "baixa";
}

function classificarTarefa(status: string, dataLimite: string | null): ActivityClassificacao {
  if (["CONCLUIDA", "CANCELADA"].includes(status)) return "concluido";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vencida = dataLimite && new Date(dataLimite) < hoje;
  if (status === "SEM_DONO" || vencida) return "atencao";
  return "em_andamento";
}

function prioridadeTarefa(status: string, dataLimite: string | null, diasSemMovimento: number): ActivityPrioridade {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (dataLimite) {
    const diasAtraso = DIAS(dataLimite);
    const diasRestantes = Math.ceil((new Date(dataLimite).getTime() - Date.now()) / 86400000);
    if (diasAtraso > 3)       return "critica";
    if (diasAtraso > 0)       return "alta";
    if (diasRestantes <= 2)   return "alta";
    if (diasRestantes <= 7)   return "media";
  }
  if (status === "SEM_DONO" && diasSemMovimento > 2) return "alta";
  if (status === "SEM_DONO") return "media";
  return "baixa";
}

function classificarProducao(status: string | null): ActivityClassificacao {
  if (["pronto", "entregue"].includes(status ?? "")) return "concluido";
  return "em_andamento";
}

// ── Tipos de input dos mappers ────────────────────────────────

export type RawPedido = {
  id: string;
  numero: string;
  status: string;
  tipo_linha?: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  fornecedor?: { nome: string } | null;
  comprador?: { nome: string } | null;
};

export type RawSolicitacao = {
  id: string;
  numero: string;
  status: string;
  prioridade?: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  solicitante?: { nome: string } | null;
};

export type RawTarefa = {
  id: string;
  titulo: string;
  status: string;
  prioridade?: string | null;
  data_limite?: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  responsavel?: { nome: string } | null;
};

export type RawTipologia = {
  id: string;
  nome: string;
  quantidade: number;
  status?: string | null;
  criado_em: string;
  loteId: string;
  loteNome: string;
  obraId: string;
};

// ── Mappers ───────────────────────────────────────────────────

export function mapPedidoToActivity(p: RawPedido): Activity {
  const diasSem = DIAS(p.atualizado_em ?? p.criado_em);
  const classificacao = classificarPedido(p.status, diasSem);
  const prioridade = prioridadePedido(p.status, diasSem);
  const subtitulo = [p.fornecedor?.nome, p.tipo_linha].filter(Boolean).join(" · ");
  return {
    id:                p.id,
    tipo:              "pedido",
    titulo:            p.numero,
    subtitulo:         subtitulo || undefined,
    status:            p.status,
    statusLabel:       PED_LABEL[p.status] ?? p.status,
    statusCor:         PED_COR[p.status]   ?? "#94a3b8",
    classificacao,
    prioridade,
    responsavel:       p.comprador?.nome,
    ultimaMovimentacao: new Date(p.atualizado_em ?? p.criado_em),
    href:              `/squadframe/compras/pedidos/${p.id}`,
    origem:            "Pedido",
    icone:             "PC",
    corBorda:          "border-l-blue-400",
    corIcone:          "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    relacionamentos:   [],
  };
}

export function mapSolicitacaoToActivity(s: RawSolicitacao): Activity {
  const diasSem = DIAS(s.atualizado_em ?? s.criado_em);
  const classificacao = classificarSolicitacao(s.status);
  const prioridade = prioridadeSolicitacao(s.status, diasSem);
  return {
    id:                s.id,
    tipo:              "solicitacao",
    titulo:            s.numero,
    subtitulo:         s.prioridade ? `Prioridade ${s.prioridade.toLowerCase()}` : undefined,
    status:            s.status,
    statusLabel:       SOL_LABEL[s.status] ?? s.status,
    statusCor:         SOL_COR[s.status]   ?? "#94a3b8",
    classificacao,
    prioridade,
    responsavel:       s.solicitante?.nome,
    ultimaMovimentacao: new Date(s.atualizado_em ?? s.criado_em),
    href:              `/squadframe/compras/solicitacoes/${s.id}`,
    origem:            "Solicitação",
    icone:             "SC",
    corBorda:          "border-l-purple-400",
    corIcone:          "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    // TODO: popular com pedido gerado via pedido_itens.solicitacao_item_id → solicitacao_itens.solicitacao_id
    relacionamentos:   [],
  };
}

export function mapTarefaToActivity(t: RawTarefa): Activity {
  const diasSem = DIAS(t.atualizado_em ?? t.criado_em);
  const classificacao = classificarTarefa(t.status, t.data_limite ?? null);
  const prioridade = prioridadeTarefa(t.status, t.data_limite ?? null, diasSem);
  return {
    id:                t.id,
    tipo:              "tarefa",
    titulo:            t.titulo,
    subtitulo:         t.data_limite
      ? `Prazo: ${new Date(t.data_limite).toLocaleDateString("pt-BR")}`
      : undefined,
    status:            t.status,
    statusLabel:       TAR_LABEL[t.status] ?? t.status,
    statusCor:         TAR_COR[t.status]   ?? "#94a3b8",
    classificacao,
    prioridade,
    responsavel:       t.responsavel?.nome,
    ultimaMovimentacao: new Date(t.atualizado_em ?? t.criado_em),
    href:              `/squadframe/tarefas?tarefa=${t.id}`,
    origem:            "Tarefa",
    icone:             "T",
    corBorda:          "border-l-amber-400",
    corIcone:          "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    relacionamentos:   [],
  };
}

export function mapTipologiaToActivity(tip: RawTipologia): Activity {
  const classificacao = classificarProducao(tip.status ?? null);
  const statusNorm = tip.status ?? "pendente";
  return {
    id:                tip.id,
    tipo:              "producao",
    titulo:            tip.nome,
    subtitulo:         `${tip.loteNome} · ${tip.quantidade} pç`,
    status:            statusNorm,
    statusLabel:       PROD_LABEL[statusNorm] ?? statusNorm,
    statusCor:         PROD_COR[statusNorm]   ?? "#94a3b8",
    classificacao,
    prioridade:        classificacao === "concluido" ? "baixa" : "media",
    responsavel:       undefined,
    ultimaMovimentacao: new Date(tip.criado_em),
    href:              `/squadframe/obras/${tip.obraId}?aba=producao`,
    origem:            "Produção",
    icone:             "P",
    corBorda:          "border-l-emerald-400",
    corIcone:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    relacionamentos:   [],
  };
}

// ── Ordenação ────────────────────────────────────────────────

const PRIORIDADE_ORDEM: Record<ActivityPrioridade, number> = {
  critica: 0,
  alta:    1,
  media:   2,
  baixa:   3,
};

export function ordenarAtividades(acts: Activity[], classificacao: ActivityClassificacao): Activity[] {
  return [...acts].sort((a, b) => {
    const pDiff = PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade];
    if (pDiff !== 0) return pDiff;
    // atencao: mais antigo primeiro (espera mais longa = mais urgente)
    // demais: mais recente primeiro
    const timeDiff = a.ultimaMovimentacao.getTime() - b.ultimaMovimentacao.getTime();
    return classificacao === "atencao" ? timeDiff : -timeDiff;
  });
}

// Filtra concluídos para mostrar apenas os dos últimos N dias
export function filtrarConcluidos(acts: Activity[], diasMaximo = 7): Activity[] {
  const corte = Date.now() - diasMaximo * 86400000;
  return acts.filter((a) => a.ultimaMovimentacao.getTime() >= corte);
}
