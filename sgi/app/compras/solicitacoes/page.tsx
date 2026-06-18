import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { STATUS_SOL_LABEL, PRIORIDADE_LABEL } from "@/types/compras";
import { SolicitacoesLista } from "./solicitacoes-lista";

export const dynamic = "force-dynamic";

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: { status?: string; obra?: string; prioridade?: string };
}) {
  const admin = createAdminClient();

  let q = admin
    .from("solicitacoes_compra")
    .select("id, numero, status, prioridade, origem, criado_em, obra:obras(nome), solicitante:usuarios(nome)")
    .order("criado_em", { ascending: false });

  if (searchParams.status) {
    q = q.eq("status", searchParams.status);
  } else {
    // Por padrão oculta solicitações já transformadas em pedido
    q = q.neq("status", "EM_PEDIDO");
  }
  if (searchParams.prioridade) q = q.eq("prioridade", searchParams.prioridade);

  const { data: solicitacoes } = await q;

  const statuses = ["ABERTA","AGUARDANDO_APROVACAO","APROVADA","REJEITADA","CANCELADA","EM_PEDIDO"];
  const prioridades = ["URGENTE","ALTA","NORMAL","BAIXA"];

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitações de Compra</h1>
          <p className="mt-1 text-sm text-ink-soft">{(solicitacoes ?? []).length} registro(s)</p>
        </div>
        <Link href="/compras/solicitacoes/nova" className="btn-primary">Nova solicitação</Link>
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/compras/solicitacoes"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!searchParams.status ? "border-steel bg-steel text-white" : "border-line text-ink-soft hover:bg-canvas"}`}>
          Todos
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/compras/solicitacoes?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.status === s ? "border-steel bg-steel text-white" : "border-line text-ink-soft hover:bg-canvas"}`}>
            {STATUS_SOL_LABEL[s as keyof typeof STATUS_SOL_LABEL]}
          </Link>
        ))}
        <span className="mx-2 border-l border-line" />
        {prioridades.map((p) => (
          <Link key={p} href={`/compras/solicitacoes?prioridade=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.prioridade === p ? "border-steel bg-steel text-white" : "border-line text-ink-soft hover:bg-canvas"}`}>
            {PRIORIDADE_LABEL[p as keyof typeof PRIORIDADE_LABEL]}
          </Link>
        ))}
      </div>

      {/* Tabela com modo excluir */}
      <div className="mt-6">
        <SolicitacoesLista solicitacoes={(solicitacoes ?? []) as any} />
      </div>
    </div>
  );
}
