import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { Button } from "@/ui/components/Button";
import { StockIcon } from "@/ui/icons";

export const dynamic = "force-dynamic";

interface SaldoRow {
  produto_id: string;
  obra_id: string;
  quantidade: number;
  atualizado_em: string;
  produto: { codigo_mestre: string; nome: string; unidade: string | null } | { codigo_mestre: string; nome: string; unidade: string | null }[] | null;
}

function nomeProduto(v: SaldoRow["produto"]): { codigo: string; nome: string; unidade: string } {
  const p = Array.isArray(v) ? v[0] ?? null : v;
  return { codigo: p?.codigo_mestre ?? "—", nome: p?.nome ?? "—", unidade: p?.unidade ?? "un" };
}

export default async function SquadStockPage({
  searchParams,
}: {
  searchParams: { obra_id?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();
  const { data: obras } = await admin.from("obras").select("id, nome").order("nome").limit(200);

  const obraId = searchParams.obra_id;

  let saldos: SaldoRow[] = [];
  if (obraId) {
    const { data } = await admin
      .from("stock_saldos")
      .select("produto_id, obra_id, quantidade, atualizado_em, produto:produtos(codigo_mestre, nome, unidade)")
      .eq("obra_id", obraId)
      .gt("quantidade", 0)
      .order("atualizado_em", { ascending: false });
    saldos = (data ?? []) as unknown as SaldoRow[];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
          <StockIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saldos de Estoque</h1>
          <p className="text-sm text-text-3">Saldo de materiais por obra — entra automaticamente no recebimento de pedidos.</p>
        </div>
      </div>

      <form method="GET" className="mt-6 flex items-end gap-3">
        <div className="flex-1 max-w-sm">
          <label className="label">Obra</label>
          <select name="obra_id" defaultValue={obraId ?? ""} className="field w-full">
            <option value="" disabled>
              Selecione uma obra
            </option>
            {(obras ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Ver saldo</Button>
      </form>

      {obraId && (
        <div className="card mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-3">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Código</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Produto</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Quantidade</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Unidade</th>
              </tr>
            </thead>
            <tbody>
              {saldos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-text-3">
                    Nenhum saldo nessa obra ainda.
                  </td>
                </tr>
              )}
              {saldos.map((s) => {
                const p = nomeProduto(s.produto);
                return (
                  <tr key={s.produto_id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-text-3 font-mono text-xs">{p.codigo}</td>
                    <td className="px-4 py-2.5">{p.nome}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{s.quantidade}</td>
                    <td className="px-4 py-2.5 text-text-3">{p.unidade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
