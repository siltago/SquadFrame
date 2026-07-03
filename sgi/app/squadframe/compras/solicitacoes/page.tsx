import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STATUS_SOL_LABEL, PRIORIDADE_LABEL } from "@/modules/squadframe/types/compras";
import { SolicitacoesLista } from "@/modules/squadframe/components/compras/solicitacoes-lista";
import { Paginacao } from "@/modules/squadframe/components/paginacao";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const POR_PAGINA = 30;

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: { status?: string; obra?: string; prioridade?: string; page?: string };
}) {
  const admin = createAdminClient();
  const pagina = Math.max(1, parseInt(searchParams.page ?? "1"));
  const from = (pagina - 1) * POR_PAGINA;

  let q = admin
    .from("solicitacoes_compra")
    .select("id, numero, status, prioridade, origem, criado_em, obra:obras(nome), solicitante:usuarios(nome)", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range(from, from + POR_PAGINA - 1);

  if (searchParams.status) {
    q = q.eq("status", searchParams.status);
  } else {
    q = q.neq("status", "EM_PEDIDO");
  }
  if (searchParams.prioridade) q = q.eq("prioridade", searchParams.prioridade);

  const { data: solicitacoes, count } = await q;

  const statuses = ["ABERTA","AGUARDANDO_APROVACAO","APROVADA","REJEITADA","CANCELADA","EM_PEDIDO"];
  const prioridades = ["URGENTE","ALTA","NORMAL","BAIXA"];

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher
        channelName="solicitacoes-compra-lista"
        subs={[{ table: "solicitacoes_compra" }]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitações de Compra</h1>
          <p className="mt-1 text-sm text-text-2">{count ?? 0} registro(s)</p>
        </div>
        <Button as="a" href="/squadframe/compras/solicitacoes/nova">Nova solicitação</Button>
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/squadframe/compras/solicitacoes"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!searchParams.status ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}>
          Todos
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/squadframe/compras/solicitacoes?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.status === s ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}>
            {STATUS_SOL_LABEL[s as keyof typeof STATUS_SOL_LABEL]}
          </Link>
        ))}
        <span className="mx-2 border-l border-border" />
        {prioridades.map((p) => (
          <Link key={p} href={`/squadframe/compras/solicitacoes?prioridade=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.prioridade === p ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}>
            {PRIORIDADE_LABEL[p as keyof typeof PRIORIDADE_LABEL]}
          </Link>
        ))}
      </div>

      <div className="mt-6 card overflow-x-auto">
        <SolicitacoesLista solicitacoes={(solicitacoes ?? []) as any} />
        <Paginacao
          paginaAtual={pagina}
          total={count ?? 0}
          porPagina={POR_PAGINA}
          buildUrl={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            if (searchParams.status) params.set("status", searchParams.status);
            if (searchParams.prioridade) params.set("prioridade", searchParams.prioridade);
            return `/squadframe/compras/solicitacoes?${params}`;
          }}
        />
      </div>
    </div>
  );
}
