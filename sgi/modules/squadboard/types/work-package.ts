// DTO real do SquadBoard. Representa um Pacote de Trabalho (lotes_obra) já
// mapeado para o que a UI do board precisa. A UI nunca deve importar o
// shape de lotes_obra diretamente; todo dado real passa por este tipo (ver
// modules/squadboard/utils/map-pacote-to-card.ts).
//
// Fase 5: o card não carrega mais um "status calculado" único — sua posição
// (`coluna`) é relativa ao Pipeline sendo consultado (ver types/pipeline.ts).
// O mesmo Pacote tem uma `coluna` diferente por Pipeline; este DTO sempre
// representa o Pacote dentro de UM pipeline por vez (o que a action buscou).

export type PrioridadePacote = "baixa" | "media" | "alta" | "critica";

export type BoardWorkPackageCard = {
  id: string;
  nome: string;
  obraId: string;
  obraNome: string;
  responsavelId: string | null;
  responsavel: string | null;
  prioridade: PrioridadePacote | null;
  prazo: string | null; // ISO date
  criadoEm: string; // ISO datetime
  progresso: number; // 0-100, calculado a partir das tipologias
  coluna: string; // posição atual do pacote dentro do pipeline consultado
  contadores: {
    tipologias: number;
    solicitacoes: number;
    pedidos: number;
  };
};
