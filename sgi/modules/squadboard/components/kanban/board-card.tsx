"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { Badge } from "@/ui/components/Badge";
import { AvatarGroup } from "@/ui/components/Avatar";
import { AttachmentIcon, CheckSquareIcon, ClockIcon } from "@/ui/icons";
import { PriorityDot } from "./priority-dot";
import type { BoardCard } from "@/modules/squadboard/types/board";

function formatarPrazo(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoje = new Date();
  const atrasado = d < hoje;
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { label, atrasado };
}

export function BoardCardItem({ card, onOpen }: { card: BoardCard; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const checklistTotal = card.checklist.length;
  const checklistFeito = card.checklist.filter((i) => i.feito).length;
  const prazo = formatarPrazo(card.prazo);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-[10px] border border-border bg-surface p-3.5",
        "transition-shadow duration-[120ms] hover:shadow-sm",
        "flex flex-col gap-2.5"
      )}
    >
      {/* Etiquetas */}
      {card.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.etiquetas.map((e) => (
            <Badge key={e.id} variant={e.cor} size="sm">
              {e.nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Título */}
      <p className="text-sm font-medium leading-snug text-text">{card.titulo}</p>

      {/* Cliente */}
      {card.cliente && (
        <p className="text-xs text-text-3">{card.cliente}</p>
      )}

      {/* Checklist progress */}
      {checklistTotal > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-text-3 transition-all duration-[180ms]"
              style={{ width: `${(checklistFeito / checklistTotal) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-text-3">{checklistFeito}/{checklistTotal}</span>
        </div>
      )}

      {/* Rodapé: prioridade, prazo, indicadores, responsáveis */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2.5 text-text-3">
          <PriorityDot prioridade={card.prioridade} />
          {prazo && (
            <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
              <ClockIcon size={11} />
              {prazo.label}
            </span>
          )}
          {card.anexos.length > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <AttachmentIcon size={11} />
              {card.anexos.length}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <CheckSquareIcon size={11} />
              {checklistFeito}/{checklistTotal}
            </span>
          )}
        </div>

        {card.responsaveis.length > 0 && (
          <AvatarGroup items={card.responsaveis.map((m) => ({ name: m.nome, src: m.avatarUrl ?? undefined }))} max={3} />
        )}
      </div>
    </div>
  );
}
