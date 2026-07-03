import type { Board, BoardCard, Membro } from "@/modules/squadboard/types/board";

// Dados de demonstração — sem persistência, sem API. Existe só para dar
// vida à camada visual enquanto o SquadBoard não tem backend próprio.

export const MEMBROS: Membro[] = [
  { id: "u1", nome: "Ana Duarte" },
  { id: "u2", nome: "Bruno Alves" },
  { id: "u3", nome: "Carla Nunes" },
  { id: "u4", nome: "Diego Souza" },
];

export const BOARD: Board = {
  id: "b1",
  nome: "Produto — Sprint atual",
  descricao: "Fluxo de trabalho do time de produto",
  colunas: [
    { id: "col-1", nome: "A fazer", ordem: 0 },
    { id: "col-2", nome: "Em andamento", ordem: 1, limiteWip: 4 },
    { id: "col-3", nome: "Em revisão", ordem: 2 },
    { id: "col-4", nome: "Concluído", ordem: 3 },
  ],
};

const agora = new Date();
const diasA = (n: number) => new Date(agora.getTime() + n * 86400000).toISOString();

export const CARDS: BoardCard[] = [
  {
    id: "c1", colunaId: "col-1", ordem: 0,
    titulo: "Revisar fluxo de onboarding",
    cliente: "Interno",
    descricao: "Mapear pontos de atrito no cadastro de novos usuários.",
    responsaveis: [MEMBROS[0]],
    prioridade: "media",
    prazo: diasA(5),
    etiquetas: [{ id: "e1", nome: "UX", cor: "info" }],
    checklist: [
      { id: "i1", texto: "Levantar métricas atuais", feito: true },
      { id: "i2", texto: "Entrevistar 3 usuários", feito: false },
    ],
    comentarios: [],
    timeline: [{ id: "t1", autor: MEMBROS[0], acao: "criou o card", criadoEm: diasA(-2) }],
    anexos: [],
    tempoEstimadoH: 6,
  },
  {
    id: "c2", colunaId: "col-1", ordem: 1,
    titulo: "Especificar exportação em PDF",
    cliente: "Financeiro",
    responsaveis: [],
    prioridade: "baixa",
    etiquetas: [{ id: "e2", nome: "Backlog", cor: "default" }],
    checklist: [],
    comentarios: [],
    timeline: [{ id: "t2", autor: MEMBROS[1], acao: "criou o card", criadoEm: diasA(-6) }],
    anexos: [],
  },
  {
    id: "c3", colunaId: "col-2", ordem: 0,
    titulo: "Implementar filtro avançado de pedidos",
    cliente: "Compras",
    descricao: "Filtro combinando status, fornecedor e período.",
    responsaveis: [MEMBROS[1], MEMBROS[2]],
    prioridade: "alta",
    prazo: diasA(2),
    etiquetas: [{ id: "e3", nome: "Feature", cor: "accent" }, { id: "e4", nome: "Sprint", cor: "warning" }],
    checklist: [
      { id: "i3", texto: "Definir campos de filtro", feito: true },
      { id: "i4", texto: "Implementar backend", feito: true },
      { id: "i5", texto: "Implementar UI", feito: false },
      { id: "i6", texto: "Testar com dados reais", feito: false },
    ],
    comentarios: [
      { id: "cm1", autor: MEMBROS[2], texto: "Já validei os campos com o time de compras.", criadoEm: diasA(-1) },
    ],
    timeline: [
      { id: "t3", autor: MEMBROS[1], acao: "criou o card", criadoEm: diasA(-4) },
      { id: "t4", autor: MEMBROS[1], acao: "moveu de A fazer para Em andamento", criadoEm: diasA(-3) },
    ],
    anexos: [{ id: "a1", nome: "wireframe-filtro.png", tamanho: "820 KB", tipo: "imagem" }],
    tempoEstimadoH: 16,
  },
  {
    id: "c4", colunaId: "col-2", ordem: 1,
    titulo: "Corrigir responsividade do painel financeiro",
    cliente: "Interno",
    responsaveis: [MEMBROS[3]],
    prioridade: "urgente",
    prazo: diasA(-1),
    etiquetas: [{ id: "e5", nome: "Bug", cor: "danger" }],
    checklist: [{ id: "i7", texto: "Reproduzir em mobile", feito: true }],
    comentarios: [],
    timeline: [{ id: "t5", autor: MEMBROS[3], acao: "criou o card", criadoEm: diasA(-1) }],
    anexos: [],
    tempoEstimadoH: 3,
  },
  {
    id: "c5", colunaId: "col-3", ordem: 0,
    titulo: "Padronizar mensagens de erro da API",
    cliente: "Interno",
    responsaveis: [MEMBROS[0], MEMBROS[3]],
    prioridade: "media",
    etiquetas: [{ id: "e6", nome: "Tech Debt", cor: "default" }],
    checklist: [
      { id: "i8", texto: "Auditar mensagens atuais", feito: true },
      { id: "i9", texto: "Criar dicionário de erros", feito: true },
    ],
    comentarios: [
      { id: "cm2", autor: MEMBROS[0], texto: "Pronto pra revisão final.", criadoEm: diasA(-1) },
    ],
    timeline: [{ id: "t6", autor: MEMBROS[0], acao: "moveu de Em andamento para Em revisão", criadoEm: diasA(-1) }],
    anexos: [],
    tempoEstimadoH: 8,
  },
  {
    id: "c6", colunaId: "col-4", ordem: 0,
    titulo: "Atualizar identidade visual do rodapé",
    cliente: "Marketing",
    responsaveis: [MEMBROS[2]],
    prioridade: "baixa",
    etiquetas: [{ id: "e7", nome: "Design", cor: "info" }],
    checklist: [{ id: "i10", texto: "Aplicar nova logo", feito: true }],
    comentarios: [],
    timeline: [
      { id: "t7", autor: MEMBROS[2], acao: "criou o card", criadoEm: diasA(-10) },
      { id: "t8", autor: MEMBROS[2], acao: "concluiu o card", criadoEm: diasA(-8) },
    ],
    anexos: [],
    tempoEstimadoH: 2,
  },
];
