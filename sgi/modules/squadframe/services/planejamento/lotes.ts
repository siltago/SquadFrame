import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";

export type TipologiaLote = {
  id: string;
  nome: string;
  quantidade: number;
  status?: string | null;
  codigo_esquadria?: string | null;
  tipo?: string | null;
  largura_mm?: number | null;
  altura_mm?: number | null;
  tratamento?: string | null;
  descricao?: string | null;
  peso_unit?: number | null;
  preco_unit?: number | null;
};

export type SolicitacaoResumoLote = {
  id: string; numero: string; status: string; prioridade: string; criado_em: string;
  solicitante?: { nome: string } | null;
};

export type PedidoResumoLote = {
  id: string; numero: string; status: string; criado_em: string;
  valor_final?: number | null; valor_itens?: number | null;
  fornecedor?: { nome: string } | null; comprador?: { nome: string } | null;
};

export type LotePlanejamento = {
  id: string;
  nome: string;
  numero_externo: string | null;
  criado_em: string;
  descricao: string | null;
  prioridade: string | null;
  prazo: string | null;
  status: string;
  etapa: string;
  compras_liberadas: boolean;
  compras_motivo_bloqueio: string | null;
  tipologias: TipologiaLote[];
  solicitacoes: SolicitacaoResumoLote[];
  pedidos: PedidoResumoLote[];
};

export async function listarLotesDaObra(obraId: string): Promise<LotePlanejamento[]> {
  const admin = createAdminClient();

  type LoteRaw = Omit<LotePlanejamento, "solicitacoes" | "pedidos" | "compras_liberadas" | "compras_motivo_bloqueio" | "tipologias"> & {
    tipologias: TipologiaLote[];
  };
  type SolicitacaoRaw = SolicitacaoResumoLote & { lote_id: string | null; solicitante: { nome: string }[] | null };
  type PedidoRaw = Omit<PedidoResumoLote, "fornecedor" | "comprador"> & {
    lote_id: string | null; fornecedor: { nome: string }[] | null; comprador: { nome: string }[] | null;
  };

  const { data: rawData } = await admin
    .from("lotes_obra")
    .select(`
      id, nome, numero_externo, criado_em, descricao, prioridade, prazo, status, etapa,
      tipologias:tipologias_obra!tipologias_obra_lote_id_fkey(id, nome, quantidade, status, codigo_esquadria, tipo, largura_mm, altura_mm, tratamento, descricao, peso_unit, preco_unit)
    `)
    .eq("obra_id", obraId)
    .order("criado_em", { ascending: true });

  const raw = (rawData ?? []) as unknown as LoteRaw[];
  const loteIds = raw.map((l) => l.id);
  if (loteIds.length === 0) return [];

  const [resSolicitacoes, resPedidos, resContextos] = await Promise.all([
    admin
      .from("solicitacoes_compra")
      .select("id, numero, status, prioridade, criado_em, lote_id, solicitante:usuarios(nome)")
      .in("lote_id", loteIds)
      .order("criado_em", { ascending: false }),
    admin
      .from("pedidos_compra")
      .select("id, numero, status, criado_em, valor_final, lote_id, fornecedor:fornecedores(nome), comprador:usuarios!pedidos_compra_comprador_id_fkey(nome)")
      .in("lote_id", loteIds)
      .order("criado_em", { ascending: false }),
    admin
      .from("frame_pacote_compras")
      .select("pacote_id, bloqueado, motivo_bloqueio")
      .in("pacote_id", loteIds),
  ]);

  const solicitacoesRaw = (resSolicitacoes.data ?? []) as unknown as SolicitacaoRaw[];
  const pedidosRaw = (resPedidos.data ?? []) as unknown as PedidoRaw[];
  const contextos = new Map((resContextos.data ?? []).map((c) => [c.pacote_id, c]));

  const pedidoIds = pedidosRaw.map((p) => p.id);
  const valorItensPorPedido = new Map<string, number>();
  if (pedidoIds.length > 0) {
    const { data: itens } = await admin
      .from("pedido_itens")
      .select("pedido_id, quantidade_pedida, preco_unitario")
      .in("pedido_id", pedidoIds);
    for (const it of itens ?? []) {
      const atual = valorItensPorPedido.get(it.pedido_id) ?? 0;
      valorItensPorPedido.set(it.pedido_id, atual + Number(it.quantidade_pedida) * Number(it.preco_unitario ?? 0));
    }
  }

  return raw.map((l) => {
    const contexto = contextos.get(l.id);
    return {
      ...l,
      compras_liberadas: !!contexto && !contexto.bloqueado,
      compras_motivo_bloqueio: contexto?.motivo_bloqueio ?? null,
      solicitacoes: solicitacoesRaw
        .filter((s) => s.lote_id === l.id)
        .map((s) => ({ ...s, solicitante: s.solicitante?.[0] ?? null })),
      pedidos: pedidosRaw
        .filter((p) => p.lote_id === l.id)
        .map((p) => ({
          ...p,
          fornecedor: p.fornecedor?.[0] ?? null,
          comprador: p.comprador?.[0] ?? null,
          valor_itens: valorItensPorPedido.get(p.id) ?? null,
        })),
    };
  });
}
