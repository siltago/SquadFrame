import Link from "next/link";
import type { LoteDashboard } from "@/modules/squadframe/services/planejamento/dashboard";
import { EmptyState } from "@/ui/components/EmptyState";
import { PRIORIDADE_LOTE as PRIORIDADE, ETAPA_LOTE_LABEL } from "@/modules/squadframe/lib/planejamento-labels";

function CardLote({ lote }: { lote: LoteDashboard }) {
  const prazoAtrasado = !!lote.prazo && new Date(lote.prazo) < new Date() && lote.concluidas < lote.totalTipologias;
  return (
    <Link
      href={`/squadframe/planejamento?aba=gerenciamento&obra=${lote.obra?.id ?? ""}`}
      className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-text truncate">{lote.nome}</span>
        <span className="ml-auto shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-3">
          {ETAPA_LOTE_LABEL[lote.etapa as keyof typeof ETAPA_LOTE_LABEL] ?? lote.etapa}
        </span>
      </div>
      <span className="text-xs text-text-3 truncate">
        {lote.obra?.codigo ? `[${lote.obra.codigo}] ` : ""}{lote.obra?.nome ?? "—"}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${lote.comprasLiberadas ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {lote.comprasLiberadas ? "Compra liberada" : "Compra bloqueada"}
        </span>
        {lote.totalTipologias > 0 && (
          <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-3">
            {lote.concluidas}/{lote.totalTipologias}
          </span>
        )}
      </div>
      {lote.prazo && (
        <div className="pt-0.5 text-right">
          <span className={`text-xs ${prazoAtrasado ? "font-semibold text-danger" : "text-text-3"}`}>
            Prazo: {new Date(lote.prazo).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
    </Link>
  );
}

// Quadro kanban por prioridade (Crítica → Alta → Média → Baixa), com a
// etapa destacada em cada card. Dentro de cada coluna a ordem já vem de
// listarLotesParaDashboard (prazo mais próximo primeiro).
export function DashboardBoard({ lotes }: { lotes: LoteDashboard[] }) {
  if (lotes.length === 0) {
    return <EmptyState title="Nenhum lote ativo" description="Lotes concluídos ou cancelados não aparecem aqui." />;
  }

  const colunas = (["CRITICA", "ALTA", "MEDIA", "BAIXA"] as const).map((chave) => ({
    etapa: chave,
    label: PRIORIDADE[chave].label,
    cor: PRIORIDADE[chave].cor,
    lotes: lotes.filter((l) => (l.prioridade ?? "MEDIA") === chave),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {colunas.map((c) => (
        <div key={c.etapa} className="flex w-72 shrink-0 flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
            <span className="text-sm font-semibold text-text">{c.label}</span>
            <span className="ml-auto text-xs text-text-3">{c.lotes.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {c.lotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-3">
                Nenhum lote
              </div>
            ) : (
              c.lotes.map((l) => <CardLote key={l.id} lote={l} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
