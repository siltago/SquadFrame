import { cn } from "@/ui/lib/cn";

export type PriorityLevel = "none" | "low" | "medium" | "high" | "critical";

const DOT_STYLES: Record<PriorityLevel, string> = {
  none:     "bg-border",
  low:      "bg-text-3",
  medium:   "bg-info",
  high:     "bg-warning",
  critical: "bg-danger",
};

const LABELS: Record<PriorityLevel, string> = {
  none:     "Sem prioridade",
  low:      "Baixa",
  medium:   "Média",
  high:     "Alta",
  critical: "Crítica",
};

interface PriorityIndicatorProps {
  level: PriorityLevel;
  showLabel?: boolean;
  className?: string;
}

export function PriorityIndicator({ level, showLabel, className }: PriorityIndicatorProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={LABELS[level]}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_STYLES[level])} />
      {showLabel && (
        <span className="text-xs text-text-3">{LABELS[level]}</span>
      )}
    </span>
  );
}
