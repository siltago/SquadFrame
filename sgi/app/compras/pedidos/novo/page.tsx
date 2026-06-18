import { createAdminClient } from "@/lib/supabase-admin";
import { NovoPedidoCliente } from "./novo-pedido-cliente";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: { from?: string; obra_id?: string };
}) {
  const admin = createAdminClient();

  const [{ data: obras }, { data: fornecedores }, { data: solAprovadas }, { data: tipos }, { data: formas }, { data: coresRal }] =
    await Promise.all([
      admin.from("obras").select("id, nome, codigo, numero").order("nome"),
      admin.from("fornecedores").select("id, nome, tipos").eq("ativo", true).order("nome"),
      admin.from("solicitacoes_compra")
        .select("id, numero, obra:obras(id, nome), itens:solicitacao_itens(id, quantidade, unidade, observacoes, descricao_manual, produto:produtos(id, codigo_mestre, nome, unidade))")
        .eq("status", "APROVADA"),
      admin.from("tipos_linha").select("id, nome, slug, unidade").order("ordem"),
      admin.from("formas_pagamento").select("id, nome").eq("ativo", true).order("nome"),
      admin.from("cores_ral").select("id, codigo_ral, nome, hex, tipos").order("codigo_ral"),
    ]);

  const fromId = searchParams.from ?? null;
  const fromSolicitacao = fromId
    ? (solAprovadas ?? []).find((s: any) => s.id === fromId) ?? null
    : null;

  const fromObraId = searchParams.obra_id ?? null;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <BackButton href={fromObraId ? `/obras/${fromObraId}?aba=pedidos` : "/compras/pedidos"} />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Novo Pedido de Compra</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Selecione fornecedor, adicione itens ou importe de solicitações aprovadas.
      </p>
      <div className="mt-6">
        <NovoPedidoCliente
          obras={obras ?? []}
          fornecedores={fornecedores ?? []}
          solicitacoesAprovadas={(solAprovadas ?? []) as any}
          tiposLinha={tipos ?? []}
          formasPagamento={formas ?? []}
          coresRal={(coresRal ?? []) as any}
          fromSolicitacao={(fromSolicitacao ?? null) as any}
          fromObraId={fromObraId}
        />
      </div>
    </div>
  );
}
