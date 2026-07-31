import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { ReceberCliente } from "@/modules/squadframe/components/compras/receber-cliente";

export const dynamic = "force-dynamic";

export default async function RecebimentoPedidoPage({ params }: { params: { pedidoId: string } }) {
  const admin = createAdminClient();

  const [{ data: ped }, { data: itens }, { data: romaneiosVinculados }] = await Promise.all([
    admin.from("pedidos_compra").select("id, numero, status, fornecedor:fornecedores(nome)").eq("id", params.pedidoId).single(),
    admin.from("vw_pedido_itens")
      .select("id, descricao_snapshot, unidade, quantidade_pedida, quantidade_recebida, saldo_pendente, produto:produtos(codigo_mestre, nome)")
      .eq("pedido_id", params.pedidoId),
    admin.from("romaneio_pedidos")
      .select("romaneio_id, romaneio:romaneios(criado_em)")
      .eq("pedido_id", params.pedidoId),
  ]);

  if (!ped) notFound();
  if (!["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(ped.status)) {
    redirect("/squadstock/recebimento");
  }

  const itensComSaldo = (itens ?? []).filter((i: any) => Number(i.saldo_pendente) > 0);
  const maisRecente = (romaneiosVinculados ?? [])
    .map((r: any) => ({ id: r.romaneio_id, criado_em: (Array.isArray(r.romaneio) ? r.romaneio[0] : r.romaneio)?.criado_em }))
    .sort((a, b) => (b.criado_em ?? "").localeCompare(a.criado_em ?? ""))[0];
  const romaneioId = maisRecente?.id ?? null;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <BackButton href="/squadstock/recebimento" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Conferência de Recebimento</h1>
      <p className="mt-1 text-sm text-text-2">
        Pedido {ped.numero} · {(ped.fornecedor as any)?.nome}
      </p>
      <div className="mt-6">
        <ReceberCliente
          pedidoId={params.pedidoId}
          itens={itensComSaldo as any}
          redirectHref="/squadstock/recebimento"
          romaneioId={romaneioId}
        />
      </div>
    </div>
  );
}
