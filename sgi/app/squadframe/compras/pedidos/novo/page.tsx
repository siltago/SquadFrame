import { redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { getTiposLinha, getFornecedores, getFormasPagamento, getCoresRal } from "@/modules/squadframe/lib/cached-queries";
import { listarNecessidadesAction, obterCoberturaAction } from "@/modules/squadframe/package-procurement/actions";
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

  const [{ data: obras }, { data: solAprovadas }, { data: lotesAtivos }, tipos, fornecedores, formas, coresRalBase] =
    await Promise.all([
      admin.from("obras").select("id, nome, codigo, numero").is("deleted_at", null).order("nome"),
      admin.from("solicitacoes_compra")
        .select("id, numero, obra:obras(id, nome), itens:solicitacao_itens(id, quantidade, unidade, observacoes, descricao_manual, produto:produtos(id, codigo_mestre, nome, unidade))")
        .eq("status", "APROVADA"),
      admin.from("lotes_obra").select("id, nome, obra_id").eq("status", "ATIVO").order("nome"),
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

  // Prefill vindo do levantamento de material de um lote (aba "Lotes" de
  // Compras) — só necessidades com produto_id resolvido entram (criar_pedido
  // não aceita descricao_livre); a quantidade sugerida é o que ainda falta
  // pedir (necessário − já pedido), não o total.
  let fromNecessidades: { id: string; quantidade: number; unidade: string; produto: { id: string; codigo_mestre: string; nome: string; unidade: string } }[] | null = null;
  let necessidadesSemProduto = 0;
  if (searchParams.origem_contexto === "LEVANTAMENTO_NECESSIDADES" && searchParams.lote_id) {
    const necessidades = await listarNecessidadesAction(searchParams.lote_id);
    const ativas = necessidades.filter((n) => n.estado_administrativo === "ATIVA");
    const { cobertura } = await obterCoberturaAction(ativas);
    const coberturaPorNecessidade = new Map(cobertura.map((c) => [c.necessidade_id, c]));

    fromNecessidades = [];
    for (const n of ativas) {
      if (!n.produto_id || !n.produto) { necessidadesSemProduto++; continue; }
      const jaPedido = coberturaPorNecessidade.get(n.id)?.pedido ?? 0;
      const faltaPedir = n.quantidade_necessaria - jaPedido;
      if (faltaPedir <= 0) continue;
      fromNecessidades.push({
        id: n.id,
        quantidade: faltaPedir,
        unidade: n.unidade,
        produto: { id: n.produto.id, codigo_mestre: n.produto.codigo_mestre, nome: n.produto.nome, unidade: n.unidade },
      });
    }
  }

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
          lotes={lotesAtivos ?? []}
          fromNecessidades={fromNecessidades}
          necessidadesSemProduto={necessidadesSemProduto}
        />
      </div>
    </div>
  );
}
