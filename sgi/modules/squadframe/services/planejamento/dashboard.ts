import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";

export type LoteDashboard = {
  id: string;
  nome: string;
  numero_externo: string | null;
  prioridade: string | null;
  status: string;
  etapa: string;
  prazo: string | null;
  obra: { id: string; nome: string; codigo: string | null } | null;
  totalTipologias: number;
  concluidas: number;
  comprasLiberadas: boolean;
};

const PRIORIDADE_ORDEM: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

// Painel estilo "quadro de aeroporto": todos os lotes ativos de todas as
// obras, sem filtro de obra — só prioridade. CRITICA sempre no topo,
// dentro de cada faixa ordena por prazo mais próximo primeiro.
export async function listarLotesParaDashboard(): Promise<LoteDashboard[]> {
  const admin = createAdminClient();

  type LoteRaw = {
    id: string; nome: string; numero_externo: string | null; prioridade: string | null;
    status: string; etapa: string; prazo: string | null;
    obra: { id: string; nome: string; codigo: string | null }[] | { id: string; nome: string; codigo: string | null } | null;
  };

  const { data } = await admin
    .from("lotes_obra")
    .select("id, nome, numero_externo, prioridade, status, etapa, prazo, obra:obras(id, nome, codigo)")
    .not("status", "in", "(CONCLUIDO,CANCELADO)");

  const raw = (data ?? []) as unknown as LoteRaw[];
  const loteIds = raw.map((l) => l.id);
  if (loteIds.length === 0) return [];

  const [{ data: tipologias }, { data: contextos }] = await Promise.all([
    admin.from("tipologias_obra").select("lote_id, status").in("lote_id", loteIds),
    admin.from("frame_pacote_compras").select("pacote_id, bloqueado").in("pacote_id", loteIds),
  ]);

  const contextoMap = new Map((contextos ?? []).map((c) => [c.pacote_id, c.bloqueado]));
  const tipologiasPorLote = new Map<string, { total: number; concluidas: number }>();
  for (const t of tipologias ?? []) {
    const atual = tipologiasPorLote.get(t.lote_id!) ?? { total: 0, concluidas: 0 };
    atual.total++;
    if (t.status === "pronto" || t.status === "entregue") atual.concluidas++;
    tipologiasPorLote.set(t.lote_id!, atual);
  }

  const lotes: LoteDashboard[] = raw.map((l) => {
    const obra = Array.isArray(l.obra) ? l.obra[0] ?? null : l.obra;
    const contagem = tipologiasPorLote.get(l.id) ?? { total: 0, concluidas: 0 };
    const bloqueado = contextoMap.get(l.id);
    return {
      id: l.id,
      nome: l.nome,
      numero_externo: l.numero_externo,
      prioridade: l.prioridade,
      status: l.status,
      etapa: l.etapa,
      prazo: l.prazo,
      obra,
      totalTipologias: contagem.total,
      concluidas: contagem.concluidas,
      comprasLiberadas: bloqueado === false,
    };
  });

  return lotes.sort((a, b) => {
    const pa = PRIORIDADE_ORDEM[a.prioridade ?? "MEDIA"] ?? 2;
    const pb = PRIORIDADE_ORDEM[b.prioridade ?? "MEDIA"] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo);
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return 0;
  });
}
