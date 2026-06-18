import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { STATUS_SOL_COR, STATUS_SOL_LABEL, STATUS_PED_COR, STATUS_PED_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/types/compras";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const admin = createAdminClient();

  const [
    { data: solAbertasData },
    { data: pedAguardandoData },
    { data: pedEmitidosData },
    { data: pedParcialData },
    { data: pendencias },
  ] = await Promise.all([
    admin.from("solicitacoes_compra").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "AGUARDANDO_APROVACAO"]),
    admin.from("pedidos_compra").select("id", { count: "exact", head: true }).eq("status", "AGUARDANDO_APROVACAO"),
    admin.from("pedidos_compra").select("id", { count: "exact", head: true }).eq("status", "EMITIDO"),
    admin.from("pedidos_compra").select("id", { count: "exact", head: true }).eq("status", "RECEBIDO_PARCIAL"),
    admin.from("solicitacoes_compra")
      .select("id, numero, status, prioridade, criado_em, obra:obras(nome)")
      .in("status", ["ABERTA", "AGUARDANDO_APROVACAO"])
      .order("prioridade", { ascending: false })
      .order("criado_em")
      .limit(20),
  ]);

  const stats = [
    { label: "Solicitações abertas",     value: (solAbertasData as any)?.length ?? 0,   href: "/compras/solicitacoes", cor: "#3b82f6" },
    { label: "Pedidos aguard. aprovação",value: (pedAguardandoData as any)?.length ?? 0, href: "/compras/pedidos",      cor: "#f59e0b" },
    { label: "Pedidos emitidos",         value: (pedEmitidosData as any)?.length ?? 0,   href: "/compras/pedidos",      cor: "#8b5cf6" },
    { label: "Recebimentos parciais",    value: (pedParcialData as any)?.length ?? 0,    href: "/compras/pedidos",      cor: "#f97316" },
  ];

  // Conta real via query separada
  const [c1, c2, c3, c4] = await Promise.all([
    admin.from("solicitacoes_compra").select("id").in("status", ["ABERTA","AGUARDANDO_APROVACAO"]),
    admin.from("pedidos_compra").select("id").eq("status","AGUARDANDO_APROVACAO"),
    admin.from("pedidos_compra").select("id").eq("status","EMITIDO"),
    admin.from("pedidos_compra").select("id").eq("status","RECEBIDO_PARCIAL"),
  ]);
  stats[0].value = (c1.data ?? []).length;
  stats[1].value = (c2.data ?? []).length;
  stats[2].value = (c3.data ?? []).length;
  stats[3].value = (c4.data ?? []).length;

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Painel de Compras</h1>
      <p className="mt-1 text-sm text-ink-soft">Visão geral e pendências prioritárias.</p>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card px-5 py-4 hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold" style={{ color: s.cor }}>{s.value}</p>
            <p className="mt-1 text-xs text-ink-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Pendências */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Solicitações pendentes
        </h2>
        {(pendencias ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhuma pendência no momento.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Obra</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Prioridade</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {(pendencias ?? []).map((s: any) => (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3">
                      <Link href={`/compras/solicitacoes/${s.id}`} className="font-mono text-xs font-semibold text-steel hover:underline">
                        {s.numero}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{s.obra?.nome ?? "—"}</td>
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
                    <td className="px-5 py-3 text-xs text-ink-faint">
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
