import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { DepositarForm } from "@/modules/squadframe/components/compras/depositar-form";
import Link from "next/link";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function CarteirasContent() {
  const usuario = await getUsuarioAtual();
  const admin = createAdminClient();

  const podeVer       = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER);
  const podeDepositar = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_DEPOSITAR);

  if (!podeVer) {
    return <p className="mt-8 text-sm text-danger">Sem permissão para visualizar carteiras.</p>;
  }

  const [
    { data: carteiras },
    { data: obras },
    { data: fornecedores },
  ] = await Promise.all([
    admin
      .from("carteiras")
      .select(`
        id, saldo_atual, atualizado_em,
        obra:obras(id, nome, codigo),
        fornecedor:fornecedores(id, nome)
      `)
      .order("atualizado_em", { ascending: false }),
    admin.from("obras").select("id, nome, codigo").order("nome").limit(200),
    admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const totalSaldo = (carteiras ?? []).reduce((s, c) => s + (c.saldo_atual ?? 0), 0);

  return (
    <div className="mt-6">
      {/* Resumo */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-2">
          {(carteiras ?? []).length} carteira(s) ativa(s)
        </p>
        <div className="card px-4 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-text-3">Total em carteiras</p>
          <p className="text-lg font-bold text-primary">{fmt(totalSaldo)}</p>
        </div>
      </div>

      {/* Formulário de depósito */}
      {podeDepositar && (
        <div className="mt-6 card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-3">
            Novo depósito
          </h2>
          <DepositarForm obras={obras ?? []} fornecedores={fornecedores ?? []} />
        </div>
      )}

      {/* Lista */}
      <div className="mt-6">
        {(carteiras ?? []).length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-text-3">
              Nenhuma carteira ainda.{" "}
              {podeDepositar ? "Faça um depósito acima para criar a primeira." : ""}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(carteiras ?? []).map((c) => {
              const obra = c.obra as any;
              const forn = c.fornecedor as any;
              return (
                <Link
                  key={c.id}
                  href={`/squadframe/financeiro/carteiras/${c.id}`}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{forn?.nome ?? "—"}</p>
                      <p className="mt-0.5 truncate text-xs text-text-3">
                        {obra?.codigo ? <span className="font-mono mr-1">[{obra.codigo}]</span> : null}
                        {obra?.nome ?? "Sem obra"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold ${c.saldo_atual > 0 ? "text-success" : "text-danger"}`}>
                        {fmt(c.saldo_atual)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-text-3">
                    Ver extrato → · {new Date(c.atualizado_em).toLocaleDateString("pt-BR")}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
