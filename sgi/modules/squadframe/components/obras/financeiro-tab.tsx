import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import Link from "next/link";
import { ObraDepositarForm } from "./obra-depositar-form";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  RASCUNHO:               { label: "Rascunho",             cor: "bg-ink-faint/10 text-text-3" },
  AGUARDANDO_APROVACAO:   { label: "Ag. Aprovação",        cor: "bg-warning-soft text-warning" },
  APROVADO:               { label: "Aprovado",             cor: "bg-blue-100 text-blue-700" },
  EMITIDO:                { label: "Emitido",              cor: "bg-purple-100 text-purple-700" },
  AGUARDANDO_RECEBIMENTO: { label: "Ag. Recebimento",      cor: "bg-cyan-100 text-cyan-700" },
  RECEBIDO_PARCIAL:       { label: "Rec. Parcial",         cor: "bg-orange-100 text-orange-700" },
  RECEBIDO:               { label: "Recebido",             cor: "bg-green-100 text-success" },
  FINALIZADO:             { label: "Finalizado",           cor: "bg-green-200 text-green-800" },
  CANCELADO:              { label: "Cancelado",            cor: "bg-danger-soft text-danger" },
};

export async function FinanceiroTab({ obraId }: { obraId: string }) {
  const usuario = await getUsuarioAtual();
  const admin = createAdminClient();

  const podeVerCarteira  = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER);
  const podeDepositar    = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_DEPOSITAR);
  const podeDashboard    = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_DASHBOARD_VER);

  const [
    { data: pedidos },
    { data: carteiras },
    { data: fornecedores },
  ] = await Promise.all([
    admin
      .from("pedidos_compra")
      .select("id, numero, status, valor_final, usa_carteira, debito_registrado, criado_em, fornecedor:fornecedores(nome)")
      .eq("obra_id", obraId)
      .neq("status", "CANCELADO")
      .order("criado_em", { ascending: false })
      .limit(100),
    podeVerCarteira
      ? admin
          .from("carteiras")
          .select("id, saldo_atual, fornecedor:fornecedores(id, nome)")
          .eq("obra_id", obraId)
          .order("saldo_atual", { ascending: false })
      : Promise.resolve({ data: [] }),
    podeDepositar
      ? admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome")
      : Promise.resolve({ data: [] }),
  ]);

  const pedidosList = pedidos ?? [];
  const carteirasList = carteiras ?? [];

  // Totais de pedidos
  const totalPedidos = pedidosList.length;
  const totalValor = pedidosList.reduce((s, p) => {
    if (p.valor_final) return s + p.valor_final;
    return s; // sem estimativa aqui para simplicidade
  }, 0);
  const saldoTotal = carteirasList.reduce((s, c) => s + (c.saldo_atual ?? 0), 0);

  return (
    <div className="mt-6 space-y-8">
      {/* ── Dashboard de pedidos ── */}
      {podeDashboard && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
            Pedidos desta obra
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-text-3">Total de pedidos</p>
              <p className="mt-1 text-2xl font-bold text-text">{totalPedidos}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-3">Valor confirmado</p>
              <p className="mt-1 text-xl font-bold text-text">{totalValor > 0 ? fmt(totalValor) : "—"}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-3">Saldo em carteiras</p>
              <p className={`mt-1 text-xl font-bold ${saldoTotal > 0 ? "text-success" : "text-text-3"}`}>
                {carteirasList.length > 0 ? fmt(saldoTotal) : "—"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-3">Faturamento direto</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {pedidosList.filter((p) => p.usa_carteira).length} pedido(s)
              </p>
            </div>
          </div>

          {/* Lista de pedidos */}
          {pedidosList.length > 0 && (
            <div className="mt-4 card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="px-4 py-2 font-medium">Pedido</th>
                    <th className="px-4 py-2 font-medium">Fornecedor</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosList.map((p) => {
                    const s = STATUS_LABEL[p.status] ?? { label: p.status, cor: "bg-bg text-text-3" };
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                        <td className="px-4 py-2.5">
                          <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs text-primary hover:underline">
                            {p.numero}
                          </Link>
                          {p.usa_carteira && (
                            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              FD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-text-2">
                          {(p.fornecedor as any)?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cor}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-text">
                          {p.valor_final ? fmt(p.valor_final) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pedidosList.length === 0 && (
            <div className="mt-4 card p-8 text-center">
              <p className="text-sm text-text-3">Nenhum pedido de compra nesta obra.</p>
              <Link href={`/squadframe/compras/pedidos/novo?obra_id=${obraId}`} className="mt-2 inline-block text-sm text-primary hover:underline">
                Criar pedido
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Carteiras ── */}
      {podeVerCarteira && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-3">
              Carteiras por fornecedor
            </h2>
            {carteirasList.length > 0 && (
              <span className="text-xs text-text-3">
                {carteirasList.length} carteira(s) · saldo total {fmt(saldoTotal)}
              </span>
            )}
          </div>

          {carteirasList.length === 0 ? (
            <div className="mt-3 card p-8 text-center">
              <p className="text-sm text-text-3">
                Nenhuma carteira ainda.{" "}
                {podeDepositar && "Faça um depósito abaixo para criar a primeira."}
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {carteirasList.map((c) => {
                const forn = c.fornecedor as any;
                return (
                  <Link
                    key={c.id}
                    href={`/squadframe/financeiro/carteiras/${c.id}`}
                    className="card p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="truncate text-sm font-semibold text-text">{forn?.nome ?? "—"}</p>
                    <p className={`mt-2 text-xl font-bold ${c.saldo_atual > 0 ? "text-success" : "text-danger"}`}>
                      {fmt(c.saldo_atual)}
                    </p>
                    <p className="mt-1 text-[10px] text-text-3">Ver extrato →</p>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Formulário de depósito */}
          {podeDepositar && (
            <div className="mt-4 card p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-3">
                Novo depósito
              </h3>
              <ObraDepositarForm obraId={obraId} fornecedores={fornecedores ?? []} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
