import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { buildSearchPattern } from "@/ui/lib/search";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";
import { PedidosLista } from "@/modules/squadframe/components/compras/pedidos-lista";
import { Paginacao } from "@/modules/squadframe/components/paginacao";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const POR_PAGINA = 30;

export default async function PedidosPage({
  searchParams,
}: { searchParams: { status?: string; fornecedor?: string; page?: string; q?: string } }) {
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.pedido.criar");

  const admin = createAdminClient();
  const pagina = Math.max(1, parseInt(searchParams.page ?? "1"));
  const from = (pagina - 1) * POR_PAGINA;
  const filtroQ = searchParams.q?.trim() ?? "";

  // Quando há busca por item: resolve pedido_ids a partir de pedido_itens
  let pedidoIdsFromItem: string[] | null = null;
  if (filtroQ) {
    const qPattern = buildSearchPattern(filtroQ);
    const { data: itemMatches } = await admin
      .from("pedido_itens")
      .select("pedido_id")
      .or(`codigo_fornecedor.ilike.${qPattern},descricao_snapshot.ilike.${qPattern}`);
    pedidoIdsFromItem = Array.from(new Set((itemMatches ?? []).map((i: any) => i.pedido_id)));
  }

  let q = admin
    .from("pedidos_compra")
    .select("id, numero, status, prazo_entrega, criado_em, obra:obras(nome), fornecedor:fornecedores(nome), comprador:usuarios(nome)", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range(from, from + POR_PAGINA - 1);

  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.fornecedor) q = q.eq("fornecedor_id", searchParams.fornecedor);
  if (pedidoIdsFromItem !== null) {
    if (pedidoIdsFromItem.length === 0) {
      // Nenhum item encontrado — retorna vazio
      q = q.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      q = q.in("id", pedidoIdsFromItem);
    }
  }

  const { data: pedidos, count } = await q;

  const statuses = ["RASCUNHO","AGUARDANDO_APROVACAO","APROVADO","EMITIDO","AGUARDANDO_RECEBIMENTO","RECEBIDO_PARCIAL","RECEBIDO","FINALIZADO","CANCELADO"];

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher
        channelName="pedidos-compra-lista"
        subs={[{ table: "pedidos_compra" }]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="mt-1 text-sm text-text-2">{count ?? 0} registro(s)</p>
        </div>
        {podeCriar && (
          <Button as="a" href="/squadframe/compras/pedidos/novo">Novo pedido</Button>
        )}
      </div>

      {/* Busca por código de item */}
      <form method="GET" action="/squadframe/compras/pedidos" className="mt-6">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.fornecedor && <input type="hidden" name="fornecedor" value={searchParams.fornecedor} />}
        <div className="relative max-w-sm">
          <input
            name="q"
            defaultValue={filtroQ}
            placeholder="Buscar por código ou item…"
            className="field h-9 w-full pl-8 text-sm"
          />
          <svg className="absolute left-2.5 top-2.5 text-text-3" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          {filtroQ && (
            <a href="/squadframe/compras/pedidos" className="absolute right-2.5 top-2.5 text-text-3 hover:text-text">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </a>
          )}
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={filtroQ ? `/squadframe/compras/pedidos?q=${encodeURIComponent(filtroQ)}` : "/squadframe/compras/pedidos"}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!searchParams.status ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}>
          Todos
        </Link>
        {statuses.map((s) => {
          const params = new URLSearchParams({ status: s });
          if (filtroQ) params.set("q", filtroQ);
          return (
            <Link key={s} href={`/squadframe/compras/pedidos?${params}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.status === s ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}>
              {STATUS_PED_LABEL[s as keyof typeof STATUS_PED_LABEL]}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 card overflow-x-auto">
        <PedidosLista pedidos={(pedidos ?? []) as any} />
        <Paginacao
          paginaAtual={pagina}
          total={count ?? 0}
          porPagina={POR_PAGINA}
          buildUrl={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            if (searchParams.status) params.set("status", searchParams.status);
            if (searchParams.fornecedor) params.set("fornecedor", searchParams.fornecedor);
            if (filtroQ) params.set("q", filtroQ);
            return `/squadframe/compras/pedidos?${params}`;
          }}
        />
      </div>
    </div>
  );
}
