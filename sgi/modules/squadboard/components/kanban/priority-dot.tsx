import { cn } from "@/ui/lib/cn";
import type { Prioridade } from "@/modules/squadboard/types/board";

// Hierarquia por contraste/tamanho, não por cor viva — só um ponto discreto.
const STYLES: Record<Prioridade, string> = {
  baixa:   "bg-text-3",
  media:   "bg-info",
  alta:    "bg-warning",
  urgente: "bg-danger",
};

const LABELS: Record<Prioridade, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

export function PriorityDot({ prioridade, showLabel }: { prioridade: Prioridade; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={LABELS[prioridade]}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STYLES[prioridade])} />
      {showLabel && <span className="text-xs text-text-3">{LABELS[prioridade]}</span>}
    </span>
  );
}
