import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";
import { colunaPadrao, type PipelineId } from "@/modules/squadboard/types/pipeline";

type TipologiaStatus = { status: string | null };

// Progresso = % de tipologias prontas ou entregues sobre o total (mesmo
// cálculo já usado em modules/squadframe/components/obras/aba-producao.tsx).
export function calcularProgresso(tipologias: TipologiaStatus[]): number {
  if (tipologias.length === 0) return 0;
  const concluidas = tipologias.filter((t) => t.status === "pronto" || t.status === "entregue").length;
  return Math.round((concluidas / tipologias.length) * 100);
}

const PRIORIDADE_MAP: Record<string, PrioridadePacote> = {
  BAIXA: "baixa",
  MEDIA: "media",
  ALTA: "alta",
  CRITICA: "critica",
};

export function mapearPrioridade(valor: string | null): PrioridadePacote | null {
  if (!valor) return null;
  return PRIORIDADE_MAP[valor] ?? null;
}

type PipelineStatusRaw = { coluna: string; ordem: number };

// Shape retornado pela query Supabase em modules/squadboard/actions/pacotes.ts
// (join com obras/usuarios volta como objeto único via PostgREST, mas o TS
// infere array para FKs simples — normaliza sem `any`, mesmo padrão já usado
// em app/squadframe/obras/[id]/page.tsx). `pipeline_status` também vem como
// array (0 ou 1 item: o filtro na query já restringe ao pipeline consultado).
export type LoteBoardRaw = {
  id: string;
  nome: string;
  criado_em: string;
  prioridade: string | null;
  prazo: string | null;
  responsavel_id: string | null;
  obra: { id: string; nome: string }[] | { id: string; nome: string } | null;
  responsavel: { nome: string }[] | { nome: string } | null;
  tipologias: TipologiaStatus[] | null;
  solicitacoes: { id: string }[] | null;
  pedidos: { id: string }[] | null;
  pipeline_status: PipelineStatusRaw[] | null;
};

export function mapLoteParaBoardCard(lote: LoteBoardRaw, pipeline: PipelineId): BoardWorkPackageCard {
  const obra = Array.isArray(lote.obra) ? lote.obra[0] ?? null : lote.obra;
  const responsavel = Array.isArray(lote.responsavel) ? lote.responsavel[0] ?? null : lote.responsavel;
  const tipologias = lote.tipologias ?? [];
  const pipelineStatus = lote.pipeline_status?.[0] ?? null;

  return {
    id: lote.id,
    nome: lote.nome,
    obraId: obra?.id ?? "",
    obraNome: obra?.nome ?? "Sem obra",
    responsavelId: lote.responsavel_id,
    responsavel: responsavel?.nome ?? null,
    prioridade: mapearPrioridade(lote.prioridade),
    prazo: lote.prazo,
    criadoEm: lote.criado_em,
    progresso: calcularProgresso(tipologias),
    coluna: pipelineStatus?.coluna ?? colunaPadrao(pipeline),
    contadores: {
      tipologias: tipologias.length,
      solicitacoes: (lote.solicitacoes ?? []).length,
      pedidos: (lote.pedidos ?? []).length,
    },
  };
}
