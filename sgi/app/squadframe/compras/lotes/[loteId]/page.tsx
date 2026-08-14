import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  obterContextoAction,
  listarNecessidadesAction,
  obterCoberturaAction,
} from "@/modules/squadframe/package-procurement/actions";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { LoteComprasPainel } from "@/modules/squadframe/components/compras/lote-compras-painel";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-600",
  ATIVO: "bg-green-100 text-green-700",
  SUSPENSO: "bg-yellow-100 text-yellow-700",
  CONCLUIDO: "bg-blue-100 text-blue-700",
  CANCELADO: "bg-red-100 text-red-600",
};

export default async function LoteComprasPage({ params }: { params: { loteId: string } }) {
  const admin = createAdminClient();
  const { data: pacoteRaw } = await admin
    .from("lotes_obra")
    .select("id, obra_id, nome, status, obra:obras(id, nome)")
    .eq("id", params.loteId)
    .maybeSingle();
  type PacoteRaw = { id: string; obra_id: string; nome: string; status: string; obra: { id: string; nome: string }[] | { id: string; nome: string } | null };
  const raw = pacoteRaw as unknown as PacoteRaw | null;
  if (!raw) notFound();
  const pacote = { ...raw, obra: Array.isArray(raw.obra) ? raw.obra[0] ?? null : raw.obra };

  const contexto = await obterContextoAction(params.loteId);
  const necessidades = contexto ? await listarNecessidadesAction(params.loteId) : [];
  const { cobertura, status } = necessidades.length
    ? await obterCoberturaAction(necessidades)
    : { cobertura: [], status: "SEM_NECESSIDADES" as const };

  const [{ data: pedidosDoLote }, { data: pedidosSoltos }] = await Promise.all([
    admin
      .from("pedidos_compra")
      .select("id, numero, status, fornecedor:fornecedores(nome), criado_em")
      .eq("lote_id", params.loteId)
      .order("criado_em", { ascending: false }),
    admin
      .from("pedidos_compra")
      .select("id, numero, status, fornecedor:fornecedores(nome), criado_em")
      .is("lote_id", null)
      .eq("obra_id", pacote.obra_id)
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher
        channelName={`compras-lote-${params.loteId}`}
        subs={[
          { table: "lotes_obra", filter: `id=eq.${params.loteId}` },
          { table: "frame_pacote_necessidades", filter: `pacote_id=eq.${params.loteId}` },
          { table: "frame_pacote_compras", filter: `pacote_id=eq.${params.loteId}` },
          { table: "pedidos_compra", filter: `lote_id=eq.${params.loteId}` },
          // pedidos "soltos" da mesma obra (lote_id NULL) também mudam a
          // lista de "vincular pedido existente" — postgres_changes não
          // suporta filtro composto (IS NULL + eq), então assina toda a
          // obra em vez de tentar combinar as duas condições.
          { table: "pedidos_compra", filter: `obra_id=eq.${pacote.obra_id}` },
        ]}
      />
      <BackButton href="/squadframe/compras/lotes" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{pacote.nome}</h1>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[pacote.status] ?? ""}`}>
          {STATUS_LABEL[pacote.status] ?? pacote.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-text-2">{pacote.obra?.nome ?? "—"}</p>

      <div className="mt-6">
        <LoteComprasPainel
          loteId={params.loteId}
          obraId={pacote.obra_id}
          contextoExiste={!!contexto}
          necessidades={necessidades}
          cobertura={cobertura}
          statusSuprimentos={status}
          pedidosDoLote={(pedidosDoLote ?? []) as any}
          pedidosSoltos={(pedidosSoltos ?? []) as any}
        />
      </div>
    </div>
  );
}
