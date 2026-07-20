import { createAdminClient } from "@/shared/database/supabase-admin";
import Link from "next/link";
import {
  Activity,
  ActivityClassificacao,
  mapPedidoToActivity,
  mapSolicitacaoToActivity,
  mapTipologiaToActivity,
  ordenarAtividades,
  filtrarConcluidos,
  RawPedido,
  RawSolicitacao,
  RawTipologia,
} from "@/modules/squadframe/utils/obras/activity";

// ── Helpers de tempo ─────────────────────────────────────────

function tempoRelativo(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 2)  return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `há ${h}h`;
  const dias = Math.floor(h / 24);
  return `há ${dias} dia${dias !== 1 ? "s" : ""}`;
}

// ── Configuração visual das seções ───────────────────────────

const SECOES = [
  {
    classificacao: "atencao" as ActivityClassificacao,
    label: "Atenção",
    descricao: "Itens que exigem ação imediata",
    dot: "bg-red-500",
    header: "border-red-200 bg-danger-soft dark:border-red-800/60 dark:bg-red-950/40",
    empty: "Nenhum item exige atenção imediata.",
  },
  {
    classificacao: "em_andamento" as ActivityClassificacao,
    label: "Em andamento",
    descricao: "Itens ativos sem bloqueio",
    dot: "bg-amber-400",
    header: "border-amber-200 bg-warning-soft dark:border-amber-800/60 dark:bg-amber-950/40",
    empty: "Nenhum item em andamento.",
  },
  {
    classificacao: "concluido" as ActivityClassificacao,
    label: "Concluído recentemente",
    descricao: "Finalizados nos últimos 7 dias",
    dot: "bg-emerald-500",
    header: "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40",
    empty: "Nenhum item concluído nos últimos 7 dias.",
  },
] as const;

const PRIORIDADE_BADGE: Record<string, string> = {
  critica: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  alta:    "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  media:   "bg-warning-soft text-warning dark:bg-amber-900/50 dark:text-amber-300",
  baixa:   "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};
const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítico",
  alta:    "Alta",
  media:   "Média",
  baixa:   "Baixo",
};

// ── ActivityCard ──────────────────────────────────────────────

function ActivityCard({ a }: { a: Activity }) {
  return (
    <Link
      href={a.href}
      className={`group flex items-start gap-4 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-bg border-l-4 ${a.corBorda}`}
    >
      {/* Badge de tipo */}
      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold tracking-wide ${a.corIcone}`}>
        {a.icone}
      </span>

      {/* Corpo */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-sm font-semibold text-text">{a.titulo}</span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: a.statusCor + "20", color: a.statusCor }}
          >
            {a.statusLabel}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_BADGE[a.prioridade]}`}>
            {PRIORIDADE_LABEL[a.prioridade]}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-2">
          {a.subtitulo && <span>{a.subtitulo}</span>}
          {a.responsavel && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-faint" />
              {a.responsavel}
            </span>
          )}
          <span className="text-text-3">{tempoRelativo(a.ultimaMovimentacao)}</span>
        </div>

        {/* Relacionamentos */}
        {a.relacionamentos.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {a.relacionamentos.map((r, i) => (
              <span
                key={i}
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1 rounded border border-border bg-bg px-2 py-0.5 text-xs text-text-2 hover:bg-surface"
              >
                <span className="text-text-3">↳</span>
                <a href={r.href} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  {r.label}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Origem */}
      <span className="shrink-0 text-xs text-text-3 opacity-0 transition-opacity group-hover:opacity-100">
        {a.origem} →
      </span>
    </Link>
  );
}

// ── Seção de classificação ────────────────────────────────────

function WorkspaceSecao({
  items,
  secao,
  obraId,
  filtroAtivo,
}: {
  items: Activity[];
  secao: typeof SECOES[number];
  obraId: string;
  filtroAtivo: string | null;
}) {
  const href = filtroAtivo === secao.classificacao
    ? `/squadframe/obras/${obraId}?aba=workspace`
    : `/squadframe/obras/${obraId}?aba=workspace&filtro=${secao.classificacao}`;

  return (
    <section>
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-t-xl border px-5 py-3 ${secao.header} transition-opacity hover:opacity-80`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${secao.dot}`} />
        <span className="text-sm font-semibold text-text">{secao.label}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-text-2">
          {items.length}
        </span>
        <span className="ml-auto text-xs text-text-3">{secao.descricao}</span>
        <span className="text-xs text-text-3">{filtroAtivo === secao.classificacao ? "✕ limpar filtro" : "filtrar"}</span>
      </Link>
      <div className="rounded-b-xl border border-t-0 border-border bg-surface overflow-hidden">
        {items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-3">{secao.empty}</p>
        ) : (
          items.map((a) => <ActivityCard key={a.id} a={a} />)
        )}
      </div>
    </section>
  );
}

// ── Componente principal ──────────────────────────────────────

export async function WorkspaceTab({
  obraId,
  filtro,
}: {
  obraId: string;
  filtro?: string;
}) {
  const supabase = createAdminClient();

  const [resPed, resSol, resLotes] = await Promise.all([
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

    supabase
      .from("lotes_obra")
      .select("id, nome, tipologias:tipologias_obra!tipologias_obra_lote_id_fkey(id, nome, quantidade, status, criado_em:created_at)")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: true }),
  ]);

  // Mapear para Activities (as unknown as T[] necessário pois Supabase infere joins como arrays)
  const pedidosAct = ((resPed.data  ?? []) as unknown as RawPedido[]).map(mapPedidoToActivity);
  const solsAct    = ((resSol.data  ?? []) as unknown as RawSolicitacao[]).map(mapSolicitacaoToActivity);
  const tipAct     = (resLotes.data ?? []).flatMap((lote: any) =>
    ((lote.tipologias ?? []) as Array<{ id: string; nome: string; quantidade: number; status: string | null; criado_em: string }>).map(
      (tip) => mapTipologiaToActivity({ ...tip, loteId: lote.id, loteNome: lote.nome, obraId }),
    ),
  );

  const todas: Activity[] = [...pedidosAct, ...solsAct, ...tipAct];

  // Separar por classificação e ordenar
  const atencao     = ordenarAtividades(todas.filter((a) => a.classificacao === "atencao"),     "atencao");
  const emAndamento = ordenarAtividades(todas.filter((a) => a.classificacao === "em_andamento"), "em_andamento");
  const concluido   = filtrarConcluidos(ordenarAtividades(todas.filter((a) => a.classificacao === "concluido"), "concluido"));

  const filtroAtivo = filtro === "atencao" || filtro === "em_andamento" || filtro === "concluido"
    ? filtro
    : null;

  const secoesVisiveis = filtroAtivo
    ? SECOES.filter((s) => s.classificacao === filtroAtivo)
    : SECOES;

  const mapaItens: Record<ActivityClassificacao, Activity[]> = {
    atencao,
    em_andamento: emAndamento,
    concluido,
  };

  const totalPorTipo = {
    pedido:      todas.filter((a) => a.tipo === "pedido").length,
    solicitacao: todas.filter((a) => a.tipo === "solicitacao").length,
    producao:    todas.filter((a) => a.tipo === "producao").length,
  };

  return (
    <div className="mt-6 space-y-5">

      {/* Contadores por módulo */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-3">
        <span className="font-medium text-text">
          {todas.length} itens no total
        </span>
        {totalPorTipo.pedido > 0 && (
          <span className="flex items-center gap-1">
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">PC</span>
            {totalPorTipo.pedido} pedido{totalPorTipo.pedido > 1 ? "s" : ""}
          </span>
        )}
        {totalPorTipo.solicitacao > 0 && (
          <span className="flex items-center gap-1">
            <span className="rounded bg-purple-100 px-1.5 py-0.5 font-bold text-purple-700">SC</span>
            {totalPorTipo.solicitacao} solicitaç{totalPorTipo.solicitacao > 1 ? "ões" : "ão"}
          </span>
        )}
        {totalPorTipo.producao > 0 && (
          <span className="flex items-center gap-1">
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">P</span>
            {totalPorTipo.producao} tipologia{totalPorTipo.producao > 1 ? "s" : ""}
          </span>
        )}
        {filtroAtivo && (
          <Link
            href={`/squadframe/obras/${obraId}?aba=workspace`}
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Mostrar todos →
          </Link>
        )}
      </div>

      {/* Seções por classificação operacional */}
      {secoesVisiveis.map((secao) => (
        <WorkspaceSecao
          key={secao.classificacao}
          items={mapaItens[secao.classificacao]}
          secao={secao}
          obraId={obraId}
          filtroAtivo={filtroAtivo}
        />
      ))}

      {todas.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-text">Nenhuma atividade registrada para esta obra</p>
          <p className="text-xs text-text-3">
            Pedidos, solicitações, tarefas e itens de produção aparecerão aqui automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
