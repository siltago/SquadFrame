import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { buscarPacoteAction } from "@/modules/wise/work-packages/actions";
import {
  obterContextoAction,
  listarNecessidadesAction,
  obterCoberturaAction,
} from "@/modules/squadframe/package-procurement/actions";
import { STATUS_LABEL, STATUS_COR } from "@/modules/wise/work-packages/types";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { LoteComprasPainel } from "@/modules/squadframe/components/compras/lote-compras-painel";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function LoteComprasPage({ params }: { params: { loteId: string } }) {
  const pacote = await buscarPacoteAction(params.loteId);
  if (!pacote) notFound();

  const contexto = await obterContextoAction(params.loteId);
  const necessidades = contexto ? await listarNecessidadesAction(params.loteId) : [];
  const { cobertura, status } = necessidades.length
    ? await obterCoberturaAction(necessidades)
    : { cobertura: [], status: "SEM_NECESSIDADES" as const };

  const admin = createAdminClient();
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
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[pacote.status]}`}>
          {STATUS_LABEL[pacote.status]}
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
