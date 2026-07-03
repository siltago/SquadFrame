import { cn } from "@/ui/lib/cn";
import type { PrioridadePacote } from "@/modules/squadboard/types/work-package";

// Hierarquia por contraste/tamanho, não por cor viva — só um ponto discreto.
const STYLES: Record<PrioridadePacote, string> = {
  baixa:   "bg-text-3",
  media:   "bg-info",
  alta:    "bg-warning",
  critica: "bg-danger",
};

const LABELS: Record<PrioridadePacote, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

export function PriorityDot({ prioridade, showLabel }: { prioridade: PrioridadePacote | null; showLabel?: boolean }) {
  if (!prioridade) {
    return (
      <span className="inline-flex items-center gap-1.5" title="Sem prioridade">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
        {showLabel && <span className="text-xs text-text-3">Sem prioridade</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5" title={LABELS[prioridade]}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STYLES[prioridade])} />
      {showLabel && <span className="text-xs text-text-3">{LABELS[prioridade]}</span>}
    </span>
  );
}
