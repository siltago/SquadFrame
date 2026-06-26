import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { SolicitacaoCliente } from "./solicitacao-cliente";
import { pluralUnit } from "@/lib/unidade";
import { STATUS_SOL_COR, STATUS_SOL_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL, ORIGEM_LABEL } from "@/types/compras";

export const dynamic = "force-dynamic";

export default async function SolicitacaoPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const usuario = await getUsuarioAtual();
  const podeCriarPedido =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("compras.pedido.criar");

  const [{ data: sol }, { data: itens }, { data: hist }] = await Promise.all([
    admin.from("solicitacoes_compra")
      .select("*, obra:obras(id,nome,codigo), solicitante:usuarios(nome)")
      .eq("id", params.id).single(),
    admin.from("solicitacao_itens")
      .select("*, produto:produtos(id, codigo_mestre, nome, unidade)")
      .eq("solicitacao_id", params.id),
    admin.from("compra_historico")
      .select("*, usuario:usuarios(nome)")
      .eq("entidade", "solicitacao").eq("entidade_id", params.id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!sol) notFound();

  const statusCor = STATUS_SOL_COR[sol.status as keyof typeof STATUS_SOL_COR];
  const isAprovada = sol.status === "APROVADA";

  return (
    <div className="px-8 py-8 max-w-4xl">
      <RealtimeRefresher
        channelName={`solicitacao-${params.id}`}
        subs={[
          { table: "solicitacoes_compra", filter: `id=eq.${params.id}` },
          { table: "solicitacao_itens",   filter: `solicitacao_id=eq.${params.id}` },
          { table: "compra_historico",    filter: `entidade_id=eq.${params.id}` },
        ]}
      />
      <BackButton href="/compras/solicitacoes" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-ink-faint">{sol.numero}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: statusCor + "20", color: statusCor }}>
              {STATUS_SOL_LABEL[sol.status as keyof typeof STATUS_SOL_LABEL]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: PRIORIDADE_COR[sol.prioridade as keyof typeof PRIORIDADE_COR] + "20", color: PRIORIDADE_COR[sol.prioridade as keyof typeof PRIORIDADE_COR] }}>
              {PRIORIDADE_LABEL[sol.prioridade as keyof typeof PRIORIDADE_LABEL]}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Solicitação de Compra</h1>
          <p className="text-sm text-ink-soft">
            {ORIGEM_LABEL[sol.origem as keyof typeof ORIGEM_LABEL]} · {(sol.obra as any)?.nome ?? "Sem obra"} · {(sol.solicitante as any)?.nome ?? "—"}
          </p>
        </div>

        <div className="flex items-start gap-3">
          {isAprovada && podeCriarPedido && (
            <a
              href={`/compras/pedidos/novo?from=${sol.id}`}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Criar pedido
            </a>
          )}
          <SolicitacaoCliente solicitacao={sol} />
        </div>
      </div>

      {sol.justificativa && (
        <div className="mt-4 rounded-lg bg-canvas px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Justificativa: </span>{sol.justificativa}
        </div>
      )}

      {/* Itens */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Itens ({(itens ?? []).length})
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Produto / Descrição</th>
                <th className="px-5 py-3 font-medium text-right">Quantidade</th>
                <th className="px-5 py-3 font-medium">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {(itens ?? []).map((it: any) => {
                const qty = Number(it.quantidade);
                const nome = it.produto?.nome ?? it.descricao_manual ?? it.descricao_snapshot ?? "—";
                const codigo = it.produto?.codigo_mestre;
                const externo = !it.produto_id;
                return (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {externo ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            EXTERNO
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-ink-faint">{codigo}</span>
                        )}
                        <span className="font-medium text-ink">{nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-ink">
                      {qty.toLocaleString("pt-BR")} {pluralUnit(qty, it.unidade)}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{it.observacoes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-faint">Histórico</h2>
        <div className="space-y-3">
          {(hist ?? []).map((h: any) => (
            <div key={h.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-steel" />
              <div>
                <span className="font-medium text-ink">{h.acao.replace(/_/g, " ")}</span>
                {h.usuario && <span className="text-ink-faint"> por {(h.usuario as any).nome}</span>}
                {h.dados?.observacoes && <p className="mt-0.5 text-ink-soft">{h.dados.observacoes}</p>}
                <p className="text-xs text-ink-faint">
                  {new Date(h.criado_em).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
