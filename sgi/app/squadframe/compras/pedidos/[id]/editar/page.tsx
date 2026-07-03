import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { EditarPedidoCliente } from "@/modules/squadframe/components/compras/editar-pedido-cliente";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const [{ data: ped }, { data: itens }, { data: fornecedores }, { data: obras }, { data: formas }] =
    await Promise.all([
      admin.from("pedidos_compra").select("*").eq("id", params.id).single(),
      admin.from("vw_pedido_itens")
        .select("*, produto:produtos(id,codigo_mestre,nome,tamanho_mm,peso_metro,preco_metro)")
        .eq("pedido_id", params.id),
      admin.from("fornecedores").select("id,nome,ativo").order("nome"),
      admin.from("obras").select("id,nome,codigo").is("deleted_at", null).order("nome"),
      admin.from("formas_pagamento").select("id,nome").eq("ativo", true).order("nome"),
    ]);

  if (!ped) notFound();
  if (!["RASCUNHO", "AGUARDANDO_APROVACAO"].includes(ped.status)) {
    redirect(`/squadframe/compras/pedidos/${params.id}`);
  }

  // cores_ral separado — falha silenciosamente se a coluna tipos não existir ainda
  const coresRal = await Promise.resolve(
    admin.from("cores_ral").select("id,codigo_ral,nome,tipos").order("codigo_ral")
  ).then((r) => r.data ?? []).catch((): any[] => []);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <BackButton href={`/squadframe/compras/pedidos/${params.id}`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Editar Pedido</h1>
      <p className="mt-1 text-sm text-text-2 font-mono">{ped.numero}</p>

      <div className="mt-6">
        <EditarPedidoCliente
          pedido={ped}
          itensIniciais={(itens ?? []) as any}
          fornecedores={(fornecedores ?? []) as any}
          obras={(obras ?? []) as any}
          formasPagamento={(formas ?? []) as any}
          coresRal={coresRal as any}
        />
      </div>
    </div>
  );
}
