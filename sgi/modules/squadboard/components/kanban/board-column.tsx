"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/ui/lib/cn";
import { PlusIcon } from "@/ui/icons";
import { BoardCardItem } from "./board-card";
import type { BoardCard, BoardColuna } from "@/modules/squadboard/types/board";

export function BoardColumn({
  coluna, cards, onOpenCard, onAddCard,
}: {
  coluna: BoardColuna;
  cards: BoardCard[];
  onOpenCard: (id: string) => void;
  onAddCard: (colunaId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id, data: { colunaId: coluna.id } });
  const acimaDoLimite = coluna.limiteWip != null && cards.length > coluna.limiteWip;

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">{coluna.nome}</h3>
          <span className={cn("text-xs", acimaDoLimite ? "font-semibold text-warning" : "text-text-3")}>
            {cards.length}{coluna.limiteWip ? ` / ${coluna.limiteWip}` : ""}
          </span>
        </div>
        <button
          onClick={() => onAddCard(coluna.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Adicionar card"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-xl p-2 transition-colors duration-[120ms]",
          isOver ? "bg-surface-2" : "bg-transparent"
        )}
        style={{ minHeight: 40 }}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCardItem key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
