import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import Link from "next/link";
import { STATUS_PED_COR, STATUS_PED_LABEL, STATUS_SOL_COR, STATUS_SOL_LABEL } from "@/modules/squadframe/types/compras";
import { Button } from "@/ui/components/Button";

function diasDesde(data: string | null | undefined): number {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

function BadgeStatus({ status, cor, label }: { status: string; cor: string; label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cor + "20", color: cor }}
    >
      {label}
    </span>
  );
}

function DiasParado({ dias, destaque }: { dias: number; destaque: boolean }) {
  if (dias === 0) return <span className="text-xs text-text-3">hoje</span>;
  return (
    <span className={`text-xs font-medium ${destaque ? "text-danger" : "text-text-3"}`}>
      {dias}d atrás
    </span>
  );
}

export async function ComprasTab({ obraId }: { obraId: string }) {
  const supabase = createAdminClient();
  const usuario = await getUsuarioAtual();
  const podeCriarPedido =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.pedido.criar");
  const podeCriarSolicitacao =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.solicitacao.criar");

  const [resPed, resSol] = await Promise.all([
    supabase
      .from("pedidos_compra")
      .select("id, numero, status, tipo_linha, criado_em, atualizado_em, fornecedor:fornecedores(nome), comprador:usuarios(nome)")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: false }),

    supabase
      .from("solicitacoes_compra")
      .select("id, numero, status, prioridade, criado_em, atualizado_em, solicitante:usuarios(nome)")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: false }),
  ]);

  const pedidos     = (resPed.data ?? []) as unknown as Array<{
    id: string; numero: string; status: string; tipo_linha: string | null;
    criado_em: string; atualizado_em?: string | null;
    fornecedor: { nome: string } | null; comprador: { nome: string } | null;
  }>;
  const solicitacoes = (resSol.data ?? []) as unknown as Array<{
    id: string; numero: string; status: string; prioridade: string;
    criado_em: string; atualizado_em?: string | null;
    solicitante: { nome: string } | null;
  }>;

  return (
    <div className="mt-6 space-y-8">

      {/* ── Pedidos ─────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-2">
            Pedidos de compra
            <span className="ml-2 rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-3">
              {pedidos.length}
            </span>
          </h2>
          {podeCriarPedido && (
            <Button as="a" href={`/squadframe/compras/pedidos/novo?obra_id=${obraId}`} className="text-sm">
              Novo pedido
            </Button>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-text">Nenhum pedido para esta obra</p>
            {podeCriarPedido && (
              <Button as="a" href={`/squadframe/compras/pedidos/novo?obra_id=${obraId}`} className="text-sm">
                Criar primeiro pedido
              </Button>
            )}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="px-5 py-3 font-medium">Pedido</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Fornecedor</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Comprador</th>
                  <th className="px-5 py-3 font-medium">Última mov.</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const cor    = STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] ?? "#94a3b8";
                  const label  = STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status;
                  const dias   = diasDesde(p.atualizado_em ?? p.criado_em);
                  const parado = p.status === "AGUARDANDO_APROVACAO" && dias > 3;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-bg ${parado ? "bg-danger-soft/40" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-sm font-bold text-primary hover:underline">
                          {p.numero}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <BadgeStatus status={p.status} cor={cor} label={label} />
                      </td>
                      <td className="px-5 py-3 text-text-2">{p.fornecedor?.nome ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-text-2">{p.tipo_linha ?? "—"}</td>
                      <td className="px-5 py-3 text-text-2">{p.comprador?.nome ?? "—"}</td>
                      <td className="px-5 py-3">
                        <DiasParado dias={dias} destaque={parado} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/squadframe/compras/pedidos/${p.id}`} className="text-xs text-primary hover:underline">
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Solicitações ───────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-2">
            Solicitações de compra
            <span className="ml-2 rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-3">
              {solicitacoes.length}
            </span>
          </h2>
          {podeCriarSolicitacao && (
            <Button as="a" href={`/squadframe/compras/solicitacoes/nova?obra_id=${obraId}`} className="text-sm">
              Nova solicitação
            </Button>
          )}
        </div>

        {solicitacoes.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-text">Nenhuma solicitação para esta obra</p>
            {podeCriarSolicitacao && (
              <Button as="a" href={`/squadframe/compras/solicitacoes/nova?obra_id=${obraId}`} className="text-sm">
                Criar primeira solicitação
              </Button>
            )}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="px-5 py-3 font-medium">Solicitação</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Prioridade</th>
                  <th className="px-5 py-3 font-medium">Solicitante</th>
                  <th className="px-5 py-3 font-medium">Última mov.</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((s) => {
                  const cor   = STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] ?? "#94a3b8";
                  const label = STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL] ?? s.status;
                  const dias  = diasDesde(s.atualizado_em ?? s.criado_em);
                  const sem_acao = ["ABERTA", "AGUARDANDO_APROVACAO"].includes(s.status) && dias > 7;
                  const PRIORIDADE_COR: Record<string, string> = { URGENTE: "#ef4444", ALTA: "#f97316", NORMAL: "#64748b", BAIXA: "#94a3b8" };
                  const priorCor = PRIORIDADE_COR[s.prioridade] ?? "#94a3b8";
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-bg ${sem_acao ? "bg-danger-soft/40" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/squadframe/compras/solicitacoes/${s.id}`} className="font-mono text-sm font-bold text-primary hover:underline">
                          {s.numero}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <BadgeStatus status={s.status} cor={cor} label={label} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium" style={{ color: priorCor }}>{s.prioridade}</span>
                      </td>
                      <td className="px-5 py-3 text-text-2">{s.solicitante?.nome ?? "—"}</td>
                      <td className="px-5 py-3">
                        <DiasParado dias={dias} destaque={sem_acao} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/squadframe/compras/solicitacoes/${s.id}`} className="text-xs text-primary hover:underline">
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
