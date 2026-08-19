import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { FinanceiroTabNav } from "@/modules/squadframe/components/financeiro/tab-nav";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

function formatarValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContratosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const podeContratos = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR));
  const podeDashboard = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_DASHBOARD_VER));
  const podeCarteiras = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER));

  if (!podeContratos) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-danger">Sem permissão para gerenciar contratos.</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: contratos } = await admin
    .from("contratos")
    .select("id, numero, valor_total, descricao, criado_em, obra:obras(nome, codigo)")
    .order("criado_em", { ascending: false });

  type ContratoRow = {
    id: string; numero: string; valor_total: number; descricao: string | null; criado_em: string;
    obra: { nome: string; codigo: string } | { nome: string; codigo: string }[] | null;
  };
  const rows = (contratos ?? []) as unknown as ContratoRow[];

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <RealtimeRefresher channelName="financeiro-contratos" subs={[{ table: "contratos" }]} />
      <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
      <FinanceiroTabNav podeDashboard={podeDashboard} podeCarteiras={podeCarteiras} podeContratos={podeContratos} />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-text-2 max-w-2xl">
          Contratos de faturamento direto por obra. O contrato não trava o gasto na obra dele — o
          valor alocado a cada fornecedor financia a carteira, e qualquer obra pode consumir dela
          desde que a soma dos contratos naquele fornecedor cubra a compra.
        </p>
        <Link href="/squadframe/financeiro/contratos/novo">
          <Button>Novo contrato</Button>
        </Link>
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-3">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Número</th>
              <th className="text-left px-4 py-2.5 font-medium">Obra</th>
              <th className="text-right px-4 py-2.5 font-medium">Valor total</th>
              <th className="text-left px-4 py-2.5 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-3">Nenhum contrato cadastrado.</td>
              </tr>
            )}
            {rows.map((c) => {
              const obra = Array.isArray(c.obra) ? c.obra[0] : c.obra;
              return (
                <tr key={c.id} className="border-t border-border hover:bg-surface-2/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/squadframe/financeiro/contratos/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{obra ? `${obra.codigo} — ${obra.nome}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatarValor(c.valor_total)}</td>
                  <td className="px-4 py-2.5 text-text-3">{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
