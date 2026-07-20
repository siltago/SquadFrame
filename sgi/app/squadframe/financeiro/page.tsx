import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";
import { CarteirasContent } from "@/modules/squadframe/components/compras/carteiras-content";
import { FinanceiroTabNav } from "@/modules/squadframe/components/financeiro/tab-nav";
import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const STATUS_FINALIZADOS = ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: {
    aba?: string;
    fornecedor?: string;
    obra?: string;
    status?: string;
    de?: string;
    ate?: string;
  };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const podeDashboard = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_DASHBOARD_VER));
  const podeCarteiras = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER));

  if (!podeDashboard && !podeCarteiras) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-danger">Sem permissão para acessar o módulo financeiro.</p>
      </div>
    );
  }

  const abaAtual =
    searchParams.aba === "carteiras" && podeCarteiras ? "carteiras" : "dashboard";

  const tabNavProps = { podeDashboard, podeCarteiras };

  // ── Aba Carteiras ──────────────────────────────────────────
  if (abaAtual === "carteiras") {
    return (
      <div className="px-8 py-8 max-w-6xl">
        <RealtimeRefresher channelName="financeiro-carteiras" subs={[{ table: "carteiras" }]} />
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <FinanceiroTabNav {...tabNavProps} />
        <CarteirasContent />
      </div>
    );
  }

  // ── Aba Dashboard ──────────────────────────────────────────
  if (!podeDashboard) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-danger">Sem permissão para o dashboard financeiro.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  const filtroFornecedor = searchParams.fornecedor ?? "";
  const filtroObra       = searchParams.obra ?? "";
  const filtroStatus     = searchParams.status ?? "";
  const filtroDe         = searchParams.de ?? "";
  const filtroAte        = searchParams.ate ?? "";

  const [{ data: fornecedores }, { data: obras }] = await Promise.all([
    admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    admin.from("obras").select("id, nome, codigo").order("nome").limit(200),
  ]);

  let q = admin
    .from("pedidos_compra")
    .select(`
      id, numero, status, criado_em, valor_final,
      fornecedor:fornecedores(id, nome),
      obra:obras(id, nome, codigo)
    `)
    .in("status", filtroStatus ? [filtroStatus] : STATUS_FINALIZADOS);

  if (filtroFornecedor) q = q.eq("fornecedor_id", filtroFornecedor);
  if (filtroObra)       q = q.eq("obra_id", filtroObra);
  if (filtroDe)         q = q.gte("criado_em", filtroDe);
  if (filtroAte)        q = q.lte("criado_em", filtroAte + "T23:59:59");

  const { data: pedidos } = await q.order("criado_em", { ascending: false }).limit(500);

  const semValorFinal = (pedidos ?? []).filter((p: any) => p.valor_final == null).map((p: any) => p.id);
  let estimados: Record<string, number> = {};
  if (semValorFinal.length > 0) {
    const { data: itensTotais } = await admin
      .from("pedido_itens")
      .select("pedido_id, preco_unitario, quantidade_pedida")
      .in("pedido_id", semValorFinal);
    for (const it of itensTotais ?? []) {
      const total = (it.preco_unitario ?? 0) * (it.quantidade_pedida ?? 0);
      estimados[it.pedido_id] = (estimados[it.pedido_id] ?? 0) + total;
    }
  }

  const pedidosComValor = (pedidos ?? []).map((p: any) => ({
    ...p,
    valor_efetivo:  p.valor_final ?? estimados[p.id] ?? 0,
    valor_estimado: p.valor_final == null,
  }));

  const totalGeral = pedidosComValor.reduce((s: number, p: any) => s + p.valor_efetivo, 0);
  const totalConfirmado = pedidosComValor
    .filter((p: any) => !p.valor_estimado)
    .reduce((s: number, p: any) => s + p.valor_efetivo, 0);

  const porFornecedor: Record<string, { nome: string; total: number; count: number }> = {};
  for (const p of pedidosComValor) {
    const fId = (p.fornecedor as any)?.id ?? "—";
    const fNome = (p.fornecedor as any)?.nome ?? "Sem fornecedor";
    if (!porFornecedor[fId]) porFornecedor[fId] = { nome: fNome, total: 0, count: 0 };
    porFornecedor[fId].total += p.valor_efetivo;
    porFornecedor[fId].count++;
  }
  const rankFornecedores = Object.values(porFornecedor).sort((a, b) => b.total - a.total);

  const porObra: Record<string, { nome: string; codigo: string | null; total: number; count: number }> = {};
  for (const p of pedidosComValor) {
    const oId = (p.obra as any)?.id ?? "sem-obra";
    const oNome = (p.obra as any)?.nome ?? "Sem obra";
    const oCod = (p.obra as any)?.codigo ?? null;
    if (!porObra[oId]) porObra[oId] = { nome: oNome, codigo: oCod, total: 0, count: 0 };
    porObra[oId].total += p.valor_efetivo;
    porObra[oId].count++;
  }
  const rankObras = Object.values(porObra).sort((a, b) => b.total - a.total);

  const porMes: Record<string, number> = {};
  for (const p of pedidosComValor) {
    const mes = p.criado_em?.slice(0, 7) ?? "—";
    porMes[mes] = (porMes[mes] ?? 0) + p.valor_efetivo;
  }
  const meses = Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]));

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtMes = (s: string) => {
    const [y, m] = s.split("-");
    return `${m}/${y}`;
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      <RealtimeRefresher
        channelName="financeiro-dashboard"
        subs={[{ table: "pedidos_compra" }, { table: "pedido_itens" }]}
      />
      <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
      <p className="mt-1 text-sm text-text-2">
        Gasto consolidado em compras. Valores sem confirmação são estimados pela soma dos itens.
      </p>

      <FinanceiroTabNav {...tabNavProps} />

      {/* Filtros */}
      <form method="GET" action="/squadframe/financeiro" className="mt-6 flex flex-wrap gap-3 items-end">
        <input type="hidden" name="aba" value="dashboard" />
        <div className="min-w-[160px] flex-1">
          <label className="label">Fornecedor</label>
          <select name="fornecedor" defaultValue={filtroFornecedor} className="field h-9 text-sm">
            <option value="">Todos os fornecedores</option>
            {(fornecedores ?? []).map((f: any) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="label">Obra</label>
          <select name="obra" defaultValue={filtroObra} className="field h-9 text-sm">
            <option value="">Todas as obras</option>
            {(obras ?? []).map((o: any) => (
              <option key={o.id} value={o.id}>{o.codigo ? `[${o.codigo}] ` : ""}{o.nome}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="label">Status</label>
          <select name="status" defaultValue={filtroStatus} className="field h-9 text-sm">
            <option value="">Emitidos / Recebidos</option>
            {STATUS_FINALIZADOS.map((s) => (
              <option key={s} value={s}>{STATUS_PED_LABEL[s as keyof typeof STATUS_PED_LABEL]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">De</label>
          <input type="date" name="de" defaultValue={filtroDe} className="field h-9 text-sm" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="ate" defaultValue={filtroAte} className="field h-9 text-sm" />
        </div>
        <Button type="submit" className="h-9 px-4 text-sm shrink-0">Filtrar</Button>
        {(filtroFornecedor || filtroObra || filtroStatus || filtroDe || filtroAte) && (
          <Button as="a" href="/squadframe/financeiro" variant="ghost" className="h-9 px-3 text-sm shrink-0">Limpar</Button>
        )}
      </form>

      {/* Cards de resumo */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Total geral</p>
          <p className="mt-1 text-2xl font-bold text-text">{fmt(totalGeral)}</p>
          <p className="text-xs text-text-3 mt-0.5">{pedidosComValor.length} pedidos</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Confirmado</p>
          <p className="mt-1 text-2xl font-bold text-success">{fmt(totalConfirmado)}</p>
          <p className="text-xs text-text-3 mt-0.5">{pedidosComValor.filter((p: any) => !p.valor_estimado).length} pedidos</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Estimado</p>
          <p className="mt-1 text-2xl font-bold text-warning">{fmt(totalGeral - totalConfirmado)}</p>
          <p className="text-xs text-text-3 mt-0.5">{pedidosComValor.filter((p: any) => p.valor_estimado).length} pedidos</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Fornecedores</p>
          <p className="mt-1 text-2xl font-bold text-text">{rankFornecedores.length}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-text">Por fornecedor</h2>
          </div>
          <div className="divide-y divide-border">
            {rankFornecedores.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-3 text-center">Nenhum dado no período.</p>
            ) : rankFornecedores.map((f, i) => {
              const pct = totalGeral > 0 ? (f.total / totalGeral) * 100 : 0;
              return (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-sm font-medium text-text truncate">{f.nome}</span>
                    <span className="text-sm font-semibold text-text shrink-0">{fmt(f.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-3 w-12 text-right">{pct.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-text-3 mt-0.5">{f.count} pedido{f.count !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-text">Por obra</h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {rankObras.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-3 text-center">Nenhum dado no período.</p>
            ) : rankObras.map((o, i) => {
              const pct = totalGeral > 0 ? (o.total / totalGeral) * 100 : 0;
              return (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-sm font-medium text-text truncate">
                      {o.codigo && <span className="font-mono text-xs text-text-3 mr-1.5">[{o.codigo}]</span>}
                      {o.nome}
                    </span>
                    <span className="text-sm font-semibold text-text shrink-0">{fmt(o.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-3 w-12 text-right">{pct.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-text-3 mt-0.5">{o.count} pedido{o.count !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {meses.length > 0 && (
        <div className="mt-6 card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-text">Evolução mensal</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="px-5 py-2 font-medium">Mês</th>
                  <th className="px-5 py-2 font-medium text-right">Valor</th>
                  <th className="px-5 py-2 font-medium">Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(([mes, val]) => {
                  const pct = totalGeral > 0 ? (val / totalGeral) * 100 : 0;
                  return (
                    <tr key={mes} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium text-text">{fmtMes(mes)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-text">{fmt(val)}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-3">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Pedidos</h2>
          <span className="text-xs text-text-3">{pedidosComValor.length} resultado{pedidosComValor.length !== 1 ? "s" : ""}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {pedidosComValor.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-text-3">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : pedidosComValor.map((p: any) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                <td className="px-5 py-2.5">
                  <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                    {p.numero}
                  </Link>
                  <p className="text-xs text-text-3">{new Date(p.criado_em).toLocaleDateString("pt-BR")}</p>
                </td>
                <td className="px-5 py-2.5 text-text-2">{(p.fornecedor as any)?.nome ?? "—"}</td>
                <td className="px-5 py-2.5 text-text-2">
                  {(p.obra as any)?.codigo
                    ? <span className="font-mono text-xs text-text-3 mr-1">[{(p.obra as any).codigo}]</span>
                    : null}
                  {(p.obra as any)?.nome ?? "—"}
                </td>
                <td className="px-5 py-2.5">
                  <span className="text-xs text-text-2">
                    {STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <span className={`font-semibold ${p.valor_estimado ? "text-warning" : "text-text"}`}>
                    {fmt(p.valor_efetivo)}
                  </span>
                  {p.valor_estimado && (
                    <p className="text-[10px] text-amber-500">estimado</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
