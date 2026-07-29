import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";
import { StatCard } from "@/modules/squadframe/components/stat-card";
import { Alert } from "@/ui/components/Alert";
import { ClockIcon, AlertTriangleIcon, CreditCardIcon } from "@/ui/icons";
import { listarSaldosPorFornecedor, filtrarSaldoBaixo } from "@/modules/squadframe/services/financeiro/carteira-alertas";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function FaturamentoDiretoContent() {
  const admin = createAdminClient();

  const [{ data: pedidos }, saldosPorFornecedor] = await Promise.all([
    admin
      .from("pedidos_compra")
      .select(`
        id, numero, status, criado_em, valor_final, debito_status, debito_rejeitado_motivo,
        fornecedor:fornecedores(id, nome),
        obra:obras(id, nome, codigo)
      `)
      .eq("usa_carteira", true)
      .eq("debito_registrado", false)
      .order("criado_em", { ascending: true }),
    listarSaldosPorFornecedor(admin),
  ]);

  const lista = pedidos ?? [];

  const semValorFinal = lista.filter((p: any) => p.valor_final == null).map((p: any) => p.id);
  const estimados: Record<string, number> = {};
  if (semValorFinal.length > 0) {
    const { data: itens } = await admin
      .from("pedido_itens")
      .select("pedido_id, preco_unitario, quantidade_pedida")
      .in("pedido_id", semValorFinal);
    for (const it of itens ?? []) {
      estimados[it.pedido_id] = (estimados[it.pedido_id] ?? 0) + (it.preco_unitario ?? 0) * (it.quantidade_pedida ?? 0);
    }
  }

  const pedidosComValor = lista.map((p: any) => ({
    ...p,
    valor_efetivo: p.valor_final ?? estimados[p.id] ?? 0,
    valor_estimado: p.valor_final == null,
  }));

  const pendentes = pedidosComValor.filter((p: any) => p.debito_status == null);
  const rejeitados = pedidosComValor.filter((p: any) => p.debito_status === "REJEITADO");
  const totalPendente = pedidosComValor.reduce((s: number, p: any) => s + p.valor_efetivo, 0);

  const saldoPorFornecedorId = new Map(saldosPorFornecedor.map((s) => [s.fornecedorId, s]));
  const alertasSaldoBaixo = filtrarSaldoBaixo(saldosPorFornecedor);

  return (
    <div>
      <p className="mt-6 text-sm text-text-2 max-w-2xl">
        Pedidos de faturamento direto que ainda não foram debitados da carteira — aguardando
        aprovação, rejeitados aguardando resolução, ou ainda sem saldo suficiente no fornecedor.
      </p>

      {/* Alertas de saldo baixo por fornecedor */}
      {alertasSaldoBaixo.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {alertasSaldoBaixo.map((s) => (
            <Alert
              key={s.fornecedorId}
              variant={s.saldo <= 0 ? "danger" : "warning"}
              title={`${s.fornecedor}${s.qtdObras > 1 ? ` (${s.qtdObras} obras)` : ""} — saldo ${s.saldo <= 0 ? "zerado" : "baixo"}`}
            >
              Saldo disponível: <strong>{fmt(s.saldo)}</strong>
              {s.totalDepositado > 0 && ` de ${fmt(s.totalDepositado)} já depositados`}
              {" — "}
              <Link href="/squadframe/financeiro?aba=carteiras" className="font-semibold underline">Ver carteiras</Link>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Aguardando débito" value={fmt(totalPendente)} sub={`${pedidosComValor.length} pedidos`} icon={CreditCardIcon} />
        <StatCard label="Pendentes de aprovação" value={pendentes.length} tone={pendentes.length > 0 ? "warning" : undefined} icon={ClockIcon} />
        <StatCard label="Rejeitados" value={rejeitados.length} tone={rejeitados.length > 0 ? "danger" : undefined} icon={AlertTriangleIcon} />
      </div>

      {/* Tabela */}
      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Pedidos não debitados</h2>
          <span className="text-xs text-text-3">{pedidosComValor.length} resultado{pedidosComValor.length !== 1 ? "s" : ""}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Situação</th>
              <th className="px-5 py-2 font-medium text-right">Valor</th>
              <th className="px-5 py-2 font-medium text-right">Saldo no fornecedor</th>
              <th className="px-5 py-2 font-medium text-right">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {pedidosComValor.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-text-3">
                  Nenhum pedido de faturamento direto aguardando débito.
                </td>
              </tr>
            ) : pedidosComValor.map((p: any) => {
              const forn = p.fornecedor as any;
              const obra = p.obra as any;
              const saldoForn = forn ? saldoPorFornecedorId.get(forn.id) : undefined;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-5 py-2.5">
                    <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                      {p.numero}
                    </Link>
                    <p className="text-xs text-text-3">{STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status}</p>
                  </td>
                  <td className="px-5 py-2.5 text-text-2">{forn?.nome ?? "—"}</td>
                  <td className="px-5 py-2.5 text-text-2">
                    {obra?.codigo && <span className="font-mono text-xs text-text-3 mr-1">[{obra.codigo}]</span>}
                    {obra?.nome ?? "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    {p.debito_status === "REJEITADO" ? (
                      <span className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger" title={p.debito_rejeitado_motivo ?? undefined}>
                        Rejeitado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`font-semibold tabular-nums ${p.valor_estimado ? "text-warning" : "text-text"}`}>
                      {fmt(p.valor_efetivo)}
                    </span>
                    {p.valor_estimado && <p className="text-[10px] text-amber-500">sem valor final</p>}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {saldoForn ? (
                      <span className={saldoForn.saldo < p.valor_efetivo ? "text-danger" : "text-text-2"}>
                        {fmt(saldoForn.saldo)}
                      </span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-text-3">{diasDesde(p.criado_em)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
