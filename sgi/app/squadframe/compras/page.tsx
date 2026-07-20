import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STATUS_SOL_COR, STATUS_SOL_LABEL, STATUS_PED_COR, STATUS_PED_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/modules/squadframe/types/compras";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const admin = createAdminClient();

  const [c1, c2, c3, c4, { data: pendencias }] = await Promise.all([
    admin.from("solicitacoes_compra").select("id").in("status", ["ABERTA","AGUARDANDO_APROVACAO"]),
    admin.from("pedidos_compra").select("id").eq("status","AGUARDANDO_APROVACAO"),
    admin.from("pedidos_compra").select("id").eq("status","AGUARDANDO_RECEBIMENTO"),
    admin.from("pedidos_compra").select("id").eq("status","RECEBIDO_PARCIAL"),
    admin.from("solicitacoes_compra")
      .select("id, numero, status, prioridade, criado_em, obra:obras(nome)")
      .in("status", ["ABERTA", "AGUARDANDO_APROVACAO"])
      .order("prioridade", { ascending: false })
      .order("criado_em")
      .limit(20),
  ]);

  const stats = [
    { label: "Solicitações abertas",      value: (c1.data ?? []).length, href: "/squadframe/compras/solicitacoes",                              cor: "#3b82f6" },
    { label: "Pedidos aguard. aprovação", value: (c2.data ?? []).length, href: "/squadframe/compras/pedidos?status=AGUARDANDO_APROVACAO",        cor: "#f59e0b" },
    { label: "Aguardando recebimento",    value: (c3.data ?? []).length, href: "/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO",      cor: "#8b5cf6" },
    { label: "Recebimentos parciais",     value: (c4.data ?? []).length, href: "/squadframe/compras/pedidos?status=RECEBIDO_PARCIAL",            cor: "#f97316" },
  ];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <RealtimeRefresher
        channelName="compras-painel"
        subs={[{ table: "solicitacoes_compra" }, { table: "pedidos_compra" }]}
      />
      <h1 className="text-2xl font-bold tracking-tight">Painel de Compras</h1>
      <p className="mt-1 text-sm text-text-2">Visão geral e pendências prioritárias.</p>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card px-5 py-4 hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold" style={{ color: s.cor }}>{s.value}</p>
            <p className="mt-1 text-xs text-text-2">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Pendências */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-3">
          Solicitações pendentes
        </h2>
        {(pendencias ?? []).length === 0 ? (
          <p className="text-sm text-text-3">Nenhuma pendência no momento.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Obra</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Prioridade</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {(pendencias ?? []).map((s: any) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="px-5 py-3">
                      <Link href={`/squadframe/compras/solicitacoes/${s.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {s.numero}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-text-2">{s.obra?.nome ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] + "20", color: STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] }}>
                        {STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: PRIORIDADE_COR[s.prioridade as keyof typeof PRIORIDADE_COR] + "20", color: PRIORIDADE_COR[s.prioridade as keyof typeof PRIORIDADE_COR] }}>
                        {PRIORIDADE_LABEL[s.prioridade as keyof typeof PRIORIDADE_LABEL]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-text-3">
                      {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
