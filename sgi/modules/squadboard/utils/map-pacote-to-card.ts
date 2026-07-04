import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";
import type { BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";
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
type EtiquetaJoinRaw = { etiqueta: { id: string; nome: string; cor: string; criado_em: string } | { id: string; nome: string; cor: string; criado_em: string }[] | null };

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
  etiquetas: EtiquetaJoinRaw[] | null;
};

function mapEtiquetas(raw: EtiquetaJoinRaw[] | null): BoardEtiqueta[] {
  if (!raw) return [];
  return raw.flatMap((e) => {
    const et = Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta;
    if (!et) return [];
    return [{ id: et.id, nome: et.nome, cor: et.cor, criadoEm: et.criado_em }];
  });
}

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
    ordem: pipelineStatus?.ordem ?? 0,
    contadores: {
      tipologias: tipologias.length,
      solicitacoes: (lote.solicitacoes ?? []).length,
      pedidos: (lote.pedidos ?? []).length,
    },
    etiquetas: mapEtiquetas(lote.etiquetas),
  };
}
