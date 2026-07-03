import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { ReceberCliente } from "@/modules/squadframe/components/compras/receber-cliente";

export const dynamic = "force-dynamic";

export default async function ReceberPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const [{ data: ped }, { data: itens }] = await Promise.all([
    admin.from("pedidos_compra").select("id, numero, status, fornecedor:fornecedores(nome)").eq("id", params.id).single(),
    admin.from("vw_pedido_itens")
      .select("id, descricao_snapshot, unidade, quantidade_pedida, quantidade_recebida, saldo_pendente, produto:produtos(codigo_mestre, nome)")
      .eq("pedido_id", params.id),
  ]);

  if (!ped) notFound();
  if (!["EMITIDO","AGUARDANDO_RECEBIMENTO","RECEBIDO_PARCIAL"].includes(ped.status)) {
    redirect(`/squadframe/compras/pedidos/${params.id}`);
  }

  const itensComSaldo = (itens ?? []).filter((i: any) => Number(i.saldo_pendente) > 0);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <BackButton href={`/squadframe/compras/pedidos/${params.id}`} />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Registrar Recebimento</h1>
      <p className="mt-1 text-sm text-text-2">
        Pedido {ped.numero} · {(ped.fornecedor as any)?.nome}
      </p>
      <div className="mt-6">
        <ReceberCliente pedidoId={params.id} itens={itensComSaldo as any} />
      </div>
    </div>
  );
}
