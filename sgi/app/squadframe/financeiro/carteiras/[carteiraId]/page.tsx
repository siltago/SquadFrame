import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import Link from "next/link";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface PedidoInfo {
  id: string; numero: string; status: string; valor_final: number | null;
  obra: { id: string; nome: string; codigo: string | null } | null;
  fornecedor: { nome: string } | null;
  comprador: { nome: string } | null;
}

interface ContratoInfo {
  contratoId: string; numero: string; tipoLinha: string;
  obra: { id: string; nome: string; codigo: string | null } | null;
  criadoPor: string | null;
}

export default async function CarteiraDetailPage({
  params,
}: {
  params: { carteiraId: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const podeVer = usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER);
  if (!podeVer) notFound();

  const admin = createAdminClient();

  const { data: carteira } = await admin
    .from("carteiras")
    .select(`
      id, saldo_atual, criado_em, atualizado_em,
      obra:obras(id, nome, codigo),
      fornecedor:fornecedores(id, nome)
    `)
    .eq("id", params.carteiraId)
    .single();

  if (!carteira) notFound();

  const { data: movimentacoes } = await admin
    .from("carteira_movimentacoes")
    .select(`
      id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_em,
      usuario:usuarios(nome)
    `)
    .eq("carteira_id", params.carteiraId)
    .order("criado_em", { ascending: false })
    .limit(200);

  const linhas = movimentacoes ?? [];

  // ── DÉBITO: de onde saiu (pedido → fornecedor/obra) e quem pediu ──
  const pedidoIds = linhas
    .filter((m) => m.referencia_tipo === "pedido" && m.referencia_id)
    .map((m) => m.referencia_id as string);

  const pedidosMap = new Map<string, PedidoInfo>();
  if (pedidoIds.length > 0) {
    const { data: pedidos } = await admin
      .from("pedidos_compra")
      .select(`
        id, numero, status, valor_final,
        obra:obras(id, nome, codigo),
        fornecedor:fornecedores(nome),
        comprador:usuarios!pedidos_compra_comprador_id_fkey(nome)
      `)
      .in("id", pedidoIds);
    for (const p of (pedidos ?? []) as any[]) {
      pedidosMap.set(p.id, {
        id: p.id, numero: p.numero, status: p.status, valor_final: p.valor_final,
        obra: Array.isArray(p.obra) ? p.obra[0] ?? null : p.obra,
        fornecedor: Array.isArray(p.fornecedor) ? p.fornecedor[0] ?? null : p.fornecedor,
        comprador: Array.isArray(p.comprador) ? p.comprador[0] ?? null : p.comprador,
      });
    }
  }

  // ── DEPÓSITO: de onde veio (contrato → destino/obra) e quem alocou ──
  const alocacaoIds = linhas
    .filter((m) => m.referencia_tipo === "contrato" && m.referencia_id)
    .map((m) => m.referencia_id as string);

  const contratosMap = new Map<string, ContratoInfo>();
  if (alocacaoIds.length > 0) {
    const { data: alocacoes } = await admin
      .from("contrato_fornecedor_alocacoes")
      .select(`
        id,
        contrato_destino:contrato_destinos(
          tipo_linha,
          contrato:contratos(id, numero, obra:obras(id, nome, codigo), usuario:usuarios(nome))
        )
      `)
      .in("id", alocacaoIds);
    for (const a of (alocacoes ?? []) as any[]) {
      const destino = Array.isArray(a.contrato_destino) ? a.contrato_destino[0] : a.contrato_destino;
      const contrato = Array.isArray(destino?.contrato) ? destino?.contrato[0] : destino?.contrato;
      if (!contrato) continue;
      const criadoPor = Array.isArray(contrato.usuario) ? contrato.usuario[0]?.nome : contrato.usuario?.nome;
      contratosMap.set(a.id, {
        contratoId: contrato.id, numero: contrato.numero, tipoLinha: destino?.tipo_linha ?? "—",
        obra: Array.isArray(contrato.obra) ? contrato.obra[0] ?? null : contrato.obra,
        criadoPor: criadoPor ?? null,
      });
    }
  }

  const obra = carteira.obra as any;
  const forn = carteira.fornecedor as any;

  const totalDepositos = linhas.filter((m) => m.tipo === "DEPOSITO").reduce((s, m) => s + m.valor, 0);
  const totalDebitos = linhas.filter((m) => m.tipo === "DEBITO").reduce((s, m) => s + m.valor, 0);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <RealtimeRefresher
        channelName={`carteira-${params.carteiraId}`}
        subs={[
          { table: "carteiras", filter: `id=eq.${params.carteiraId}` },
          { table: "carteira_movimentacoes", filter: `carteira_id=eq.${params.carteiraId}` },
        ]}
      />
      <Link href="/squadframe/financeiro?aba=carteiras" className="text-xs text-text-3 hover:text-text-2">
        ← Voltar às carteiras
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{forn?.nome ?? "—"}</h1>
          <p className="mt-1 text-sm text-text-2">
            {obra?.codigo && <span className="font-mono mr-1">[{obra.codigo}]</span>}
            {obra?.nome ?? "Sem obra"}
          </p>
        </div>
        <div className="card p-4 text-right">
          <p className="text-xs uppercase tracking-wide text-text-3">Saldo nesta obra</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${carteira.saldo_atual > 0 ? "text-success" : "text-danger"}`}>
            {fmt(carteira.saldo_atual)}
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Total depositado</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-success">{fmt(totalDepositos)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Total debitado</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-danger">{fmt(totalDebitos)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-text-3">Movimentações</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-text">{linhas.length}</p>
        </div>
      </div>

      {/* Extrato */}
      <div className="mt-8 card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-text">Extrato</h2>
        </div>

        {linhas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-3">Nenhuma movimentação.</p>
        ) : (
          <div className="divide-y divide-border">
            {linhas.map((m) => {
              const usuarioNome = (m.usuario as any)?.nome ?? "—";
              const pedido = m.referencia_tipo === "pedido" && m.referencia_id ? pedidosMap.get(m.referencia_id) : null;
              const contrato = m.referencia_tipo === "contrato" && m.referencia_id ? contratosMap.get(m.referencia_id) : null;
              const overflow = pedido?.obra && obra?.id && pedido.obra.id !== obra.id;

              return (
                <div key={m.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.tipo === "DEPOSITO" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}>
                          {m.tipo === "DEPOSITO" ? "▲ Depósito" : "▼ Débito"}
                        </span>
                        <span className="text-xs text-text-3">{new Date(m.criado_em).toLocaleString("pt-BR")}</span>
                        {overflow && (
                          <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">
                            Saldo usado por outra obra
                          </span>
                        )}
                      </div>

                      {/* Origem/destino específico */}
                      <div className="mt-1.5 text-sm text-text">
                        {pedido ? (
                          <>
                            Pedido{" "}
                            <Link href={`/squadframe/compras/pedidos/${pedido.id}`} className="font-mono font-semibold text-primary hover:underline">
                              {pedido.numero}
                            </Link>
                            {" — "}{pedido.fornecedor?.nome ?? forn?.nome ?? "—"}
                            {pedido.obra && (
                              <>
                                {" · "}
                                {pedido.obra.codigo && <span className="font-mono text-xs text-text-3">[{pedido.obra.codigo}] </span>}
                                {pedido.obra.nome}
                              </>
                            )}
                          </>
                        ) : contrato ? (
                          <>
                            Contrato{" "}
                            <Link href={`/squadframe/financeiro/contratos/${contrato.contratoId}`} className="font-mono font-semibold text-primary hover:underline">
                              {contrato.numero}
                            </Link>
                            {" — "}{contrato.tipoLinha}
                            {contrato.obra && (
                              <>
                                {" · "}
                                {contrato.obra.codigo && <span className="font-mono text-xs text-text-3">[{contrato.obra.codigo}] </span>}
                                {contrato.obra.nome}
                              </>
                            )}
                          </>
                        ) : m.referencia_tipo === "pedido" ? (
                          <span className="text-xs italic text-text-3">Pedido excluído</span>
                        ) : (
                          <span className="text-text-2">{m.descricao ?? "—"}</span>
                        )}
                      </div>

                      {/* Quem pediu / quem autorizou */}
                      <p className="mt-1 text-xs text-text-3">
                        {pedido ? (
                          <>
                            Solicitado por <span className="font-medium text-text-2">{pedido.comprador?.nome ?? "—"}</span>
                            {" · "}Autorizado por <span className="font-medium text-text-2">{usuarioNome}</span>
                          </>
                        ) : contrato ? (
                          <>
                            Contrato criado por <span className="font-medium text-text-2">{contrato.criadoPor ?? "—"}</span>
                            {" · "}Alocado por <span className="font-medium text-text-2">{usuarioNome}</span>
                          </>
                        ) : (
                          <>Por <span className="font-medium text-text-2">{usuarioNome}</span></>
                        )}
                      </p>
                    </div>

                    <span className={`shrink-0 text-right font-semibold tabular-nums ${m.tipo === "DEPOSITO" ? "text-success" : "text-danger"}`}>
                      {m.tipo === "DEBITO" ? "−" : "+"}{fmt(m.valor)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
