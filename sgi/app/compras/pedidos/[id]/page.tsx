import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { BackButton } from "@/components/back-button";
import { PedidoCliente } from "./pedido-cliente";
import { PedidoTabs } from "./pedido-tabs";
import { STATUS_PED_COR, STATUS_PED_LABEL } from "@/types/compras";

export const dynamic = "force-dynamic";

export default async function PedidoPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  // Queries sobre tabelas que definitivamente existem
  const [{ data: ped }, { data: itens }, { data: recebimentos }, { data: hist }, { data: tiposLinha }] =
    await Promise.all([
      admin.from("pedidos_compra")
        .select("*, obra:obras(id,nome,codigo), fornecedor:fornecedores(nome,email,telefone), comprador:usuarios(nome), forma_pagamento:formas_pagamento(nome)")
        .eq("id", params.id).single(),
      admin.from("vw_pedido_itens")
        .select("*, produto:produtos(codigo_mestre, nome, peso_metro, tamanho_mm)")
        .eq("pedido_id", params.id),
      admin.from("recebimentos")
        .select("*, responsavel:usuarios(nome), itens:recebimento_itens(*, pedido_item:pedido_itens(descricao_snapshot))")
        .eq("pedido_id", params.id).order("criado_em", { ascending: false }),
      admin.from("compra_historico")
        .select("*, usuario:usuarios(nome)")
        .eq("entidade", "pedido").eq("entidade_id", params.id)
        .order("criado_em", { ascending: false }),
      admin.from("tipos_linha").select("id, nome, slug").order("ordem"),
    ]);

  if (!ped) notFound();

  // Queries sobre tabelas novas — falham silenciosamente se não existirem ainda
  const [
    [{ data: anotacoes }, { data: documentos }],
    coresRalResult,
  ] = await Promise.all([
    Promise.all([
      admin.from("pedido_anotacoes")
        .select("*, usuario:usuarios(nome)")
        .eq("pedido_id", params.id).order("criado_em", { ascending: false }),
      admin.from("pedido_documentos")
        .select("*, usuario:usuarios(nome)")
        .eq("pedido_id", params.id).order("criado_em", { ascending: false }),
    ]).catch(() => [{ data: [] }, { data: [] }]),
    Promise.resolve(admin.from("cores_ral").select("id, codigo_ral, nome, hex").order("codigo_ral"))
      .then((r) => r.data ?? []).catch((): any[] => []),
  ]);

  const coresRal = coresRalResult as any[];

  const cor = STATUS_PED_COR[ped.status as keyof typeof STATUS_PED_COR];
  const tipoNome = ped.tipo_linha
    ? (tiposLinha ?? []).find((t: any) => t.slug === ped.tipo_linha)?.nome ?? ped.tipo_linha
    : null;

  return (
    <div className="px-8 py-8 max-w-6xl">
      <BackButton href="/compras/pedidos" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-ink-faint">{ped.numero}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: cor + "20", color: cor }}>
              {STATUS_PED_LABEL[ped.status as keyof typeof STATUS_PED_LABEL]}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {tipoNome ? `Pedido de ${tipoNome}` : "Pedido de Compra"}
          </h1>
          <p className="text-sm text-ink-soft">
            {(ped.fornecedor as any)?.nome} · {(ped.obra as any)?.nome ?? "Sem obra"} · {(ped.comprador as any)?.nome}
          </p>
        </div>
        <PedidoCliente pedido={ped} />
      </div>

      <div className="mt-6">
        <PedidoTabs
          pedido={ped}
          itens={itens ?? []}
          recebimentos={recebimentos ?? []}
          historico={hist ?? []}
          anotacoes={anotacoes ?? []}
          documentos={documentos ?? []}
          coresRal={coresRal}
        />
      </div>
    </div>
  );
}
