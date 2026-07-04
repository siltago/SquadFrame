"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { Avatar } from "@/ui/components/Avatar";
import { BoardCard, DragHandle } from "@/ui/components/kanban";
import { LayersIcon, DocumentIcon, CartIcon, ClockIcon } from "@/ui/icons";
import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";

const PRIORITY_STRIP: Record<PrioridadePacote, string> = {
  baixa: "bg-text-3/40",
  media: "bg-info",
  alta: "bg-warning",
  critica: "bg-danger",
};

function formatarPrazo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const atrasado = d < new Date();
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { label, atrasado };
}

export function BoardCardItem({ card, onOpen }: { card: BoardWorkPackageCard; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card },
  });

  const prazo = formatarPrazo(card.prazo);

  const strip = card.etiquetas.length === 0 && card.prioridade
    ? PRIORITY_STRIP[card.prioridade]
    : undefined;

  return (
    <BoardCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      isDragging={isDragging}
      onClick={onOpen}
      colorStrip={strip}
    >
      {/* Drag handle + nome */}
      <div className="flex items-start gap-1.5">
        <DragHandle size="sm" className="mt-0.5 shrink-0" {...attributes} {...listeners} />
        <p className="flex-1 text-sm font-medium leading-snug text-text">{card.nome}</p>
      </div>

      {/* Etiquetas */}
      {card.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.etiquetas.map((e) => (
            <span
              key={e.id}
              title={e.nome}
              className="h-2 w-7 rounded-full"
              style={{ backgroundColor: e.cor }}
            />
          ))}
        </div>
      )}

      {/* Obra */}
      <p className="truncate text-xs text-text-3">{card.obraNome}</p>

      {/* Progresso */}
      {card.contadores.tipologias > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary/40 transition-all duration-[180ms]"
              style={{ width: `${card.progresso}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-text-3">{card.progresso}%</span>
        </div>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2.5 text-text-3">
          {prazo && (
            <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
              <ClockIcon size={11} />
              {prazo.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px]" title="Tipologias">
            <LayersIcon size={11} />{card.contadores.tipologias}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title="Solicitações">
            <DocumentIcon size={11} />{card.contadores.solicitacoes}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title="Pedidos">
            <CartIcon size={11} />{card.contadores.pedidos}
          </span>
        </div>
        {card.responsavel && <Avatar name={card.responsavel} size="sm" />}
      </div>
    </BoardCard>
  );
}
