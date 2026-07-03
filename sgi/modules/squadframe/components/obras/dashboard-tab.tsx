import { createAdminClient } from "@/shared/database/supabase-admin";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────

function diasDesde(data: string | null | undefined): number {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

function tempoRelativo(data: string): string {
  const minutos = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
  if (minutos < 2)  return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24)   return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias !== 1 ? "s" : ""}`;
}

type Semaforo = "verde" | "amarelo" | "vermelho" | "cinza";

function semCls(s: Semaforo) {
  if (s === "vermelho") return { dot: "bg-red-500",     card: "border-red-200 bg-danger-soft dark:border-red-800/60 dark:bg-red-950/40",         txt: "text-red-700 dark:text-red-400"       };
  if (s === "amarelo")  return { dot: "bg-amber-400",   card: "border-amber-200 bg-warning-soft dark:border-amber-800/60 dark:bg-amber-950/40", txt: "text-warning dark:text-amber-400"   };
  if (s === "verde")    return { dot: "bg-emerald-500", card: "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40", txt: "text-emerald-700 dark:text-emerald-400" };
  return                       { dot: "bg-zinc-300",    card: "border-border bg-bg",                                                      txt: "text-text-3"                       };
}

// ── Semáforos ─────────────────────────────────────────────────

type SemaforoResult = { cor: Semaforo; descricao: string; pct?: number };

function semCompras(
  pedidos: Array<{ status: string; atualizado_em?: string | null; criado_em: string }>,
  sols: Array<{ status: string; atualizado_em?: string | null; criado_em: string }>,
): SemaforoResult {
  const pedParados = pedidos.filter(
    (p) => p.status === "AGUARDANDO_APROVACAO" && diasDesde(p.atualizado_em ?? p.criado_em) > 3,
  );
  const solParadas = sols.filter(
    (s) => ["ABERTA", "AGUARDANDO_APROVACAO"].includes(s.status) && diasDesde(s.atualizado_em ?? s.criado_em) > 7,
  );

  if (pedParados.length > 0)
    return { cor: "vermelho", descricao: `${pedParados.length} pedido${pedParados.length > 1 ? "s" : ""} parado${pedParados.length > 1 ? "s" : ""}` };
  if (solParadas.length > 0)
    return { cor: "vermelho", descricao: `${solParadas.length} solicitação${solParadas.length > 1 ? "ões" : ""} sem ação` };

  const pedAguardando = pedidos.filter((p) => p.status === "AGUARDANDO_APROVACAO");
  if (pedAguardando.length > 0)
    return { cor: "amarelo", descricao: `${pedAguardando.length} aguardando aprovação` };

  const solAtivas = sols.filter((s) => ["ABERTA", "AGUARDANDO_APROVACAO"].includes(s.status));
  if (solAtivas.length > 0)
    return { cor: "amarelo", descricao: `${solAtivas.length} solicitação${solAtivas.length > 1 ? "ões" : ""} em aberto` };

  return { cor: "verde", descricao: "Sem pendências" };
}

function semTarefas(
  tarefas: Array<{ status: string; data_limite: string | null; criado_em: string }>,
): SemaforoResult {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const atrasadas = tarefas.filter(
    (t) => t.data_limite && new Date(t.data_limite) < hoje && !["CONCLUIDA", "CANCELADA"].includes(t.status),
  );
  const semDono = tarefas.filter((t) => t.status === "SEM_DONO" && diasDesde(t.criado_em) > 2);

  if (atrasadas.length > 0)
    return { cor: "vermelho", descricao: `${atrasadas.length} tarefa${atrasadas.length > 1 ? "s" : ""} atrasada${atrasadas.length > 1 ? "s" : ""}` };
  if (semDono.length > 0)
    return { cor: "amarelo", descricao: `${semDono.length} sem responsável` };

  const ativas = tarefas.filter((t) => !["CONCLUIDA", "CANCELADA"].includes(t.status));
  if (ativas.length === 0) return { cor: "verde", descricao: "Sem tarefas ativas" };
  return { cor: "verde", descricao: `${ativas.length} em andamento` };
}

function semProducao(tipologias: Array<{ status: string | null; quantidade: number }>): SemaforoResult {
  if (tipologias.length === 0) return { cor: "cinza", descricao: "Sem tipologias" };
  const STATUS_DONE = ["pronto", "entregue"];
  const total = tipologias.reduce((a, t) => a + (t.quantidade || 1), 0);
  const done  = tipologias.filter((t) => STATUS_DONE.includes(t.status ?? "")).reduce((a, t) => a + (t.quantidade || 1), 0);
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  if (pct >= 80) return { cor: "verde",    descricao: `${pct}% concluído`, pct };
  if (pct >= 40) return { cor: "amarelo",  descricao: `${pct}% concluído`, pct };
  return             { cor: "vermelho", descricao: `${pct}% concluído`, pct };
}

function semPrazo(dataPrevista: string | null): SemaforoResult {
  if (!dataPrevista) return { cor: "cinza", descricao: "Sem data prevista" };
  const dias = Math.ceil((new Date(dataPrevista).getTime() - Date.now()) / 86400000);
  if (dias < 0)  return { cor: "vermelho", descricao: `Venceu há ${-dias} dia${-dias !== 1 ? "s" : ""}` };
  if (dias < 7)  return { cor: "vermelho", descricao: `${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}` };
  if (dias < 30) return { cor: "amarelo",  descricao: `${dias} dias restantes` };
  return               { cor: "verde",    descricao: `${dias} dias restantes` };
}

// ── Gargalos ─────────────────────────────────────────────────

type Gargalo = {
  nivel: "critico" | "atencao";
  descricao: string;
  detalhe: string;
  href: string;
  linkLabel: string;
};

function identificarGargalos(
  obraId: string,
  pedidos: Array<{ id: string; numero: string; status: string; atualizado_em?: string | null; criado_em: string }>,
  sols: Array<{ id: string; numero: string; status: string; atualizado_em?: string | null; criado_em: string }>,
  tarefas: Array<{ id: string; titulo: string; status: string; data_limite: string | null; criado_em: string }>,
): Gargalo[] {
  const g: Gargalo[] = [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  for (const p of pedidos) {
    if (p.status !== "AGUARDANDO_APROVACAO") continue;
    const dias = diasDesde(p.atualizado_em ?? p.criado_em);
    if (dias >= 3) g.push({ nivel: "critico", descricao: `Pedido ${p.numero} aguardando aprovação`, detalhe: `${dias} dia${dias !== 1 ? "s" : ""} parado`, href: `/squadframe/compras/pedidos/${p.id}`, linkLabel: "Ver pedido" });
    else if (dias >= 1) g.push({ nivel: "atencao", descricao: `Pedido ${p.numero} aguardando aprovação`, detalhe: `${dias} dia${dias !== 1 ? "s" : ""} aguardando`, href: `/squadframe/compras/pedidos/${p.id}`, linkLabel: "Ver pedido" });
  }

  for (const s of sols) {
    if (!["ABERTA", "AGUARDANDO_APROVACAO"].includes(s.status)) continue;
    const dias = diasDesde(s.atualizado_em ?? s.criado_em);
    if (dias >= 7) g.push({ nivel: "critico", descricao: `Solicitação ${s.numero} sem ação`, detalhe: `${dias} dias em aberto`, href: `/squadframe/compras/solicitacoes/${s.id}`, linkLabel: "Ver solicitação" });
    else if (dias >= 3) g.push({ nivel: "atencao", descricao: `Solicitação ${s.numero} pendente`, detalhe: `${dias} dias aguardando`, href: `/squadframe/compras/solicitacoes/${s.id}`, linkLabel: "Ver solicitação" });
  }

  for (const t of tarefas.slice(0, 3)) {
    if (!t.data_limite || new Date(t.data_limite) >= hoje || ["CONCLUIDA","CANCELADA"].includes(t.status)) continue;
    const dias = diasDesde(t.data_limite);
    g.push({ nivel: "critico", descricao: `"${t.titulo}" atrasada`, detalhe: `${dias} dia${dias !== 1 ? "s" : ""} em atraso`, href: `/squadframe/obras/${obraId}?aba=workspace&filtro=atencao`, linkLabel: "Ver workspace" });
  }

  const semDono = tarefas.filter((t) => t.status === "SEM_DONO" && diasDesde(t.criado_em) > 2);
  if (semDono.length > 0)
    g.push({ nivel: "atencao", descricao: `${semDono.length} tarefa${semDono.length > 1 ? "s" : ""} sem responsável`, detalhe: `Aguardando atribuição`, href: `/squadframe/obras/${obraId}?aba=workspace&filtro=atencao`, linkLabel: "Ver workspace" });

  return g.sort((a) => (a.nivel === "critico" ? -1 : 1));
}

// ── Componente ────────────────────────────────────────────────

export async function DashboardTab({
  obraId,
  dataPrevista,
}: {
  obraId: string;
  dataPrevista: string | null;
}) {
  const supabase = createAdminClient();

  const [resPed, resSol, resTar, resLotes, resHist] = await Promise.all([
    supabase
      .from("pedidos_compra")
      .select("id, numero, status, criado_em, atualizado_em, fornecedor:fornecedores(nome)")
      .eq("obra_id", obraId)
      .not("status", "in", "(CANCELADO,RECEBIDO,FINALIZADO)")
      .order("criado_em", { ascending: false }),

    supabase
      .from("solicitacoes_compra")
      .select("id, numero, status, criado_em, atualizado_em")
      .eq("obra_id", obraId)
      .not("status", "in", "(CANCELADA,EM_PEDIDO)")
      .order("criado_em", { ascending: false }),

    supabase
      .from("tarefas")
      .select("id, titulo, status, prioridade, data_limite, criado_em, responsavel:usuarios!usuario_responsavel_id(nome)")
      .eq("obra_id", obraId)
      .is("deleted_at", null)
      .not("status", "in", "(CONCLUIDA,CANCELADA)")
      .order("data_limite", { ascending: true, nullsFirst: false }),

    supabase
      .from("lotes_obra")
      .select("tipologias:tipologias_obra(status, quantidade)")
      .eq("obra_id", obraId),

    supabase
      .from("obra_historico")
      .select("acao, motivo, criado_em, usuario:usuarios(nome)")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: false })
      .limit(8),
  ]);

  const pedidos     = (resPed.data   ?? []) as unknown as Array<{ id: string; numero: string; status: string; criado_em: string; atualizado_em?: string | null; fornecedor: { nome: string } | null }>;
  const sols        = (resSol.data   ?? []) as unknown as Array<{ id: string; numero: string; status: string; criado_em: string; atualizado_em?: string | null }>;
  const tarefas     = (resTar.data   ?? []) as unknown as Array<{ id: string; titulo: string; status: string; prioridade: string; data_limite: string | null; criado_em: string; responsavel: { nome: string } | null }>;
  const tipologias  = (resLotes.data ?? []).flatMap((l: any) => (l.tipologias ?? []) as Array<{ status: string | null; quantidade: number }>);
  const historico   = (resHist.data  ?? []) as unknown as Array<{ acao: string; motivo: string | null; criado_em: string; usuario: { nome: string } | null }>;

  const sCom = semCompras(pedidos, sols);
  const sTar = semTarefas(tarefas);
  const sPro = semProducao(tipologias);
  const sPra = semPrazo(dataPrevista);
  const gargalos = identificarGargalos(obraId, pedidos, sols, tarefas);

  const STATUS_DONE = ["pronto", "entregue"];
  const totalPcs    = tipologias.reduce((a, t) => a + (t.quantidade || 1), 0);
  const donePcs     = tipologias.filter((t) => STATUS_DONE.includes(t.status ?? "")).reduce((a, t) => a + (t.quantidade || 1), 0);

  // Contagens para os cards (tarefas têm seção própria, não entram nos cards do workspace)
  const nPedidosAtencao = pedidos.filter(p => p.status === "AGUARDANDO_APROVACAO").length;
  const nSolsAtencao    = sols.filter(s => ["ABERTA", "AGUARDANDO_APROVACAO", "REJEITADA"].includes(s.status)).length;
  const nAtencaoTotal   = nPedidosAtencao + nSolsAtencao;
  const nEmAndamento    = pedidos.filter(p => !["AGUARDANDO_APROVACAO","RECEBIDO","FINALIZADO","CANCELADO"].includes(p.status)).length
                        + sols.filter(s => ["APROVADA","EM_PEDIDO"].includes(s.status)).length;

  const semaforos = [
    { label: "Compras",  s: sCom, href: `?aba=workspace&filtro=atencao` },
    { label: "Tarefas",  s: sTar, href: null                            },
    { label: "Produção", s: sPro, href: `?aba=producao`                 },
    { label: "Prazo",    s: sPra, href: null                            },
  ] as const;

  const resumoCards = [
    {
      label: "Atenção",
      valor: String(nAtencaoTotal),
      sub: nAtencaoTotal === 0 ? "Nenhuma pendência em compras" : `${nPedidosAtencao} pedido${nPedidosAtencao !== 1 ? "s" : ""} · ${nSolsAtencao} sol.`,
      href: `?aba=workspace&filtro=atencao`,
      destaque: nAtencaoTotal > 0,
    },
    {
      label: "Em andamento",
      valor: String(nEmAndamento),
      sub: "pedidos e solicitações",
      href: `?aba=workspace&filtro=em_andamento`,
      destaque: false,
    },
    {
      label: "Produção",
      valor: totalPcs > 0 ? `${donePcs}/${totalPcs}` : "—",
      sub: totalPcs > 0 ? "peças concluídas" : "Nenhuma tipologia",
      href: `?aba=producao`,
      destaque: false,
    },
    {
      label: "Ver workspace",
      valor: String(pedidos.length + sols.length),
      sub: "pedidos e solicitações",
      href: `?aba=workspace`,
      destaque: false,
    },
  ];

  return (
    <div className="mt-6 space-y-6">

      {/* Semáforos */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {semaforos.map(({ label, s, href }) => {
          const cls = semCls(s.cor);
          const inner = (
            <div className={`flex items-start gap-3 rounded-xl border p-4 ${cls.card} h-full`}>
              <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${cls.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-3">{label}</p>
                <p className={`mt-0.5 text-sm font-semibold ${cls.txt}`}>{s.descricao}</p>
                {"pct" in s && s.pct !== undefined && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div className={`h-full rounded-full ${cls.dot}`} style={{ width: `${s.pct}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
          return href ? (
            <Link key={label} href={href} className="block transition-opacity hover:opacity-80">
              {inner}
            </Link>
          ) : (
            <div key={label}>{inner}</div>
          );
        })}
      </div>

      {/* Gargalos */}
      {gargalos.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-text">Pendências que precisam de atenção</h2>
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {gargalos.length}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {gargalos.map((g, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${g.nivel === "critico" ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{g.descricao}</p>
                  <p className="text-xs text-text-3">{g.detalhe}</p>
                </div>
                <Link href={g.href} className="shrink-0 text-xs font-medium text-primary hover:underline">
                  {g.linkLabel} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards de resumo / navegação */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumoCards.map(({ label, valor, sub, href, destaque }) => (
          <Link
            key={label}
            href={href}
            className={`card flex flex-col gap-1 p-4 transition-colors hover:bg-bg ${destaque ? "border-red-200 bg-danger-soft dark:border-red-800/60 dark:bg-red-950/40" : ""}`}
          >
            <p className={`text-xs font-medium uppercase tracking-wider ${destaque ? "text-danger dark:text-red-400" : "text-text-3"}`}>{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${destaque ? "text-red-700 dark:text-red-300" : "text-text"}`}>{valor}</p>
            <p className={`text-xs ${destaque ? "text-danger/70 dark:text-red-400/70" : "text-text-2"}`}>{sub}</p>
          </Link>
        ))}
      </div>

      {/* Tarefas da obra */}
      <div className="card overflow-x-auto">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-text">Tarefas</h2>
          {tarefas.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {tarefas.length} ativa{tarefas.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {tarefas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-3">Nenhuma tarefa ativa para esta obra.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tarefas.map((t) => {
              const hoje2 = new Date(); hoje2.setHours(0, 0, 0, 0);
              const atrasada = t.data_limite && new Date(t.data_limite) < hoje2;
              const semDono  = t.status === "SEM_DONO";
              const PRIO_CLS: Record<string, string> = {
                CRITICA: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                ALTA:    "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
                MEDIA:   "bg-warning-soft text-warning dark:bg-amber-900/50 dark:text-amber-300",
                BAIXA:   "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
              };
              const PRIO_LABEL: Record<string, string> = {
                CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa",
              };
              const STATUS_LABEL: Record<string, string> = {
                SEM_DONO: "Sem dono", ACEITA: "Aceita",
                EM_ANDAMENTO: "Em andamento", AGUARDANDO: "Aguardando",
              };
              return (
                <li key={t.id}>
                  <Link
                    href={`/squadframe/tarefas?tarefa=${t.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-bg"
                  >
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${atrasada || semDono ? "bg-red-500" : "bg-primary/40"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${atrasada || semDono ? "text-text" : "text-text"}`}>
                        {t.titulo}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-3">
                        <span>{STATUS_LABEL[t.status] ?? t.status}</span>
                        {t.responsavel && <span>· {t.responsavel.nome}</span>}
                        {t.data_limite && (
                          <span className={atrasada ? "font-medium text-danger dark:text-red-400" : ""}>
                            · {atrasada ? "Atrasada" : "Prazo"}: {new Date(t.data_limite).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {semDono && <span className="text-danger dark:text-red-400">· Sem responsável</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIO_CLS[t.prioridade] ?? PRIO_CLS.BAIXA}`}>
                      {PRIO_LABEL[t.prioridade] ?? t.prioridade}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Últimas atividades */}
      <div className="card overflow-x-auto">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-text">Últimas atividades</h2>
        </div>
        {historico.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-3">Nenhuma atividade registrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {historico.map((h, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    {h.acao.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                  </p>
                  {h.motivo && <p className="text-xs text-text-2">{h.motivo}</p>}
                </div>
                <div className="shrink-0 text-right">
                  {h.usuario && <p className="text-xs text-text-2">{h.usuario.nome}</p>}
                  <p className="text-xs text-text-3">{tempoRelativo(h.criado_em)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
