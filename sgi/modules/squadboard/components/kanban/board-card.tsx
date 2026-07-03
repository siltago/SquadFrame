"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { Avatar } from "@/ui/components/Avatar";
import { LayersIcon, DocumentIcon, CartIcon, ClockIcon } from "@/ui/icons";
import { PriorityDot } from "./priority-dot";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";

function formatarPrazo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoje = new Date();
  const atrasado = d < hoje;
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { label, atrasado };
}

export function BoardCardItem({ card, onOpen }: { card: BoardWorkPackageCard; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

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
      {/* Nome do pacote */}
      <p className="text-sm font-medium leading-snug text-text">{card.nome}</p>

      {/* Obra */}
      <p className="truncate text-xs text-text-3">{card.obraNome}</p>

      {/* Progresso das tipologias */}
      {card.contadores.tipologias > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-text-3 transition-all duration-[180ms]"
              style={{ width: `${card.progresso}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-text-3">{card.progresso}%</span>
        </div>
      )}

      {/* Rodapé: prioridade, prazo, contadores, responsável */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2.5 text-text-3">
          <PriorityDot prioridade={card.prioridade} />
          {prazo && (
            <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
              <ClockIcon size={11} />
              {prazo.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px]" title="Tipologias">
            <LayersIcon size={11} />
            {card.contadores.tipologias}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title="Solicitações de compra">
            <DocumentIcon size={11} />
            {card.contadores.solicitacoes}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title="Pedidos de compra">
            <CartIcon size={11} />
            {card.contadores.pedidos}
          </span>
        </div>

        {card.responsavel && <Avatar name={card.responsavel} size="sm" />}
      </div>
    </div>
  );
}
