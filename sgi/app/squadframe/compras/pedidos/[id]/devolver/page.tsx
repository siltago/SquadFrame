import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { DevolucaoPedidoForm } from "@/modules/squadframe/components/compras/devolucao-pedido-form";

export const dynamic = "force-dynamic";

const STATUS_DEVOLUCAO = ["RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];

export default async function DevolverPedidoPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const [{ data: ped }, { data: itens }] = await Promise.all([
    admin.from("pedidos_compra").select("id, numero, status, valor_final").eq("id", params.id).single(),
    admin.from("vw_pedido_itens")
      .select("id, descricao_snapshot, unidade, quantidade_pedida, quantidade_recebida, preco_unitario")
      .eq("pedido_id", params.id),
  ]);

  if (!ped) notFound();

  if (!STATUS_DEVOLUCAO.includes(ped.status)) {
    redirect(`/squadframe/compras/pedidos/${params.id}`);
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <BackButton href={`/squadframe/compras/pedidos/${params.id}`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Devolução de Pedido</h1>
      <p className="mt-1 text-sm text-text-2 font-mono">{ped.numero}</p>

      <div className="mt-6">
        <DevolucaoPedidoForm
          pedidoId={params.id}
          itens={(itens ?? []) as any}
          valorFinalPedido={ped.valor_final != null ? Number(ped.valor_final) : null}
        />
      </div>
    </div>
  );
}
