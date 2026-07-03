import { redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { getTiposLinha, getFornecedores, getFormasPagamento, getCoresRal } from "@/modules/squadframe/lib/cached-queries";
import { NovoPedidoCliente } from "@/modules/squadframe/components/compras/novo-pedido-cliente";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: { from?: string; obra_id?: string; lote_id?: string; origem_contexto?: string };
}) {
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.pedido.criar");
  if (!podeCriar) redirect("/squadframe/compras/pedidos");

  const admin = createAdminClient();

  const [{ data: obras }, { data: solAprovadas }, tipos, fornecedores, formas, coresRalBase] =
    await Promise.all([
      admin.from("obras").select("id, nome, codigo, numero").is("deleted_at", null).order("nome"),
      admin.from("solicitacoes_compra")
        .select("id, numero, obra:obras(id, nome), itens:solicitacao_itens(id, quantidade, unidade, observacoes, descricao_manual, produto:produtos(id, codigo_mestre, nome, unidade))")
        .eq("status", "APROVADA"),
      getTiposLinha(),
      getFornecedores(),
      getFormasPagamento(),
      getCoresRal(),
    ]);

  // cores_ral cached query não inclui tipos[] — busca rápida via cache ou fallback
  const coresRal = coresRalBase as any[];

  const fromId = searchParams.from ?? null;
  const fromSolicitacao = fromId
    ? (solAprovadas ?? []).find((s: any) => s.id === fromId) ?? null
    : null;

  const fromObraId = searchParams.obra_id ?? null;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <BackButton href={fromObraId ? `/squadframe/obras/${fromObraId}?aba=pedidos` : "/squadframe/compras/pedidos"} />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Novo Pedido de Compra</h1>
      <p className="mt-1 text-sm text-text-2">
        Selecione fornecedor, adicione itens ou importe de solicitações aprovadas.
      </p>
      <div className="mt-6">
        <NovoPedidoCliente
          obras={obras ?? []}
          fornecedores={fornecedores as any[]}
          solicitacoesAprovadas={(solAprovadas ?? []) as any}
          tiposLinha={tipos as any[]}
          formasPagamento={formas as any[]}
          coresRal={coresRal}
          fromSolicitacao={(fromSolicitacao ?? null) as any}
          fromObraId={fromObraId}
          loteId={searchParams.lote_id ?? null}
          origemContexto={searchParams.origem_contexto ?? null}
        />
      </div>
    </div>
  );
}
