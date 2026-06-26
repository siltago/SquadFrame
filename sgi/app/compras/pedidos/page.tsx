import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { STATUS_PED_LABEL } from "@/types/compras";
import { PedidosLista } from "./pedidos-lista";
import { Paginacao } from "@/components/paginacao";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export const dynamic = "force-dynamic";

const POR_PAGINA = 30;

export default async function PedidosPage({
  searchParams,
}: { searchParams: { status?: string; fornecedor?: string; page?: string } }) {
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.pedido.criar");

  const admin = createAdminClient();
  const pagina = Math.max(1, parseInt(searchParams.page ?? "1"));
  const from = (pagina - 1) * POR_PAGINA;

  let q = admin
    .from("pedidos_compra")
    .select("id, numero, status, prazo_entrega, criado_em, obra:obras(nome), fornecedor:fornecedores(nome), comprador:usuarios(nome)", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range(from, from + POR_PAGINA - 1);

  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.fornecedor) q = q.eq("fornecedor_id", searchParams.fornecedor);

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
          <p className="mt-1 text-sm text-ink-soft">{count ?? 0} registro(s)</p>
        </div>
        {podeCriar && (
          <Link href="/compras/pedidos/novo" className="btn-primary">Novo pedido</Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/compras/pedidos"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!searchParams.status ? "border-steel bg-steel text-white" : "border-line text-ink-soft hover:bg-canvas"}`}>
          Todos
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/compras/pedidos?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.status === s ? "border-steel bg-steel text-white" : "border-line text-ink-soft hover:bg-canvas"}`}>
            {STATUS_PED_LABEL[s as keyof typeof STATUS_PED_LABEL]}
          </Link>
        ))}
      </div>

      <div className="mt-6 card overflow-x-auto">
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
            return `/compras/pedidos?${params}`;
          }}
        />
      </div>
    </div>
  );
}
