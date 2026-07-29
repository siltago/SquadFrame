import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { CarteirasPorObra, type ObraComCarteiras } from "@/modules/squadframe/components/compras/carteiras-por-obra";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function CarteirasContent() {
  const usuario = await getUsuarioAtual();
  const admin = createAdminClient();

  const podeVer = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER);

  if (!podeVer) {
    return <p className="mt-8 text-sm text-danger">Sem permissão para visualizar carteiras.</p>;
  }

  const { data: carteiras } = await admin
    .from("carteiras")
    .select(`
      id, saldo_atual, atualizado_em,
      obra:obras(id, nome, codigo),
      fornecedor:fornecedores(id, nome)
    `)
    .order("saldo_atual", { ascending: false });

  const linhas = (carteiras ?? []) as unknown as {
    id: string; saldo_atual: number; atualizado_em: string;
    obra: { id: string; nome: string; codigo: string | null } | null;
    fornecedor: { id: string; nome: string } | null;
  }[];

  const totalSaldo = linhas.reduce((s, c) => s + (c.saldo_atual ?? 0), 0);

  // Total pooled por fornecedor — o que de fato está disponível pra gastar
  // (soma entre todas as obras, mesmo critério usado em confirmar_debito_carteira).
  const totalPorFornecedor = new Map<string, number>();
  for (const c of linhas) {
    if (!c.fornecedor) continue;
    totalPorFornecedor.set(c.fornecedor.id, (totalPorFornecedor.get(c.fornecedor.id) ?? 0) + c.saldo_atual);
  }

  // Agrupa por obra — cada obra some com suas carteiras (uma por fornecedor).
  const porObra = new Map<string, ObraComCarteiras>();
  for (const c of linhas) {
    if (!c.obra) continue;
    if (!porObra.has(c.obra.id)) {
      porObra.set(c.obra.id, { obra: c.obra, totalObra: 0, carteiras: [] });
    }
    const grupo = porObra.get(c.obra.id)!;
    grupo.totalObra += c.saldo_atual;
    grupo.carteiras.push({
      id: c.id,
      fornecedor: c.fornecedor ?? { id: "—", nome: "—" },
      saldo: c.saldo_atual,
      totalPooled: c.fornecedor ? totalPorFornecedor.get(c.fornecedor.id) ?? c.saldo_atual : c.saldo_atual,
      atualizadoEm: c.atualizado_em,
    });
  }
  const obrasComCarteira = [...porObra.values()].sort((a, b) => b.totalObra - a.totalObra);

  return (
    <div className="mt-6">
      {/* Resumo */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-2">
          {obrasComCarteira.length} obra{obrasComCarteira.length !== 1 ? "s" : ""} com carteira · {linhas.length} carteira{linhas.length !== 1 ? "s" : ""} ativa{linhas.length !== 1 ? "s" : ""}
        </p>
        <div className="card px-4 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-text-3">Total em carteiras</p>
          <p className="text-lg font-bold tabular-nums text-primary">{fmt(totalSaldo)}</p>
        </div>
      </div>

      {/* Lista por obra */}
      <div className="mt-6">
        {obrasComCarteira.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-text-3">
              Nenhuma obra com carteira ainda. Carteiras são financiadas alocando valor de um{" "}
              <a href="/squadframe/financeiro/contratos" className="text-primary hover:underline">contrato</a> a um fornecedor.
            </p>
          </div>
        ) : (
          <CarteirasPorObra obras={obrasComCarteira} />
        )}
      </div>
    </div>
  );
}
