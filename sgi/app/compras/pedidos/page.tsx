import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { STATUS_PED_LABEL } from "@/types/compras";
import { PedidosLista } from "./pedidos-lista";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  searchParams,
}: { searchParams: { status?: string; fornecedor?: string } }) {
  const admin = createAdminClient();

  let q = admin
    .from("pedidos_compra")
    .select("id, numero, status, prazo_entrega, criado_em, obra:obras(nome), fornecedor:fornecedores(nome), comprador:usuarios(nome)")
    .order("criado_em", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.fornecedor) q = q.eq("fornecedor_id", searchParams.fornecedor);

  const { data: pedidos } = await q;

  const statuses = ["RASCUNHO","AGUARDANDO_APROVACAO","APROVADO","EMITIDO","AGUARDANDO_RECEBIMENTO","RECEBIDO_PARCIAL","RECEBIDO","FINALIZADO","CANCELADO"];

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="mt-1 text-sm text-ink-soft">{(pedidos ?? []).length} registro(s)</p>
        </div>
        <Link href="/compras/pedidos/novo" className="btn-primary">Novo pedido</Link>
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

      <div className="mt-6">
        <PedidosLista pedidos={(pedidos ?? []) as any} />
      </div>
    </div>
  );
}
