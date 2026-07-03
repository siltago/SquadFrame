"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/ui/lib/cn";
import { EmptyState } from "@/ui/components/EmptyState";
import { BoardCardItem } from "./board-card";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

export function BoardColumn({
  coluna, cards, onOpenCard,
}: {
  coluna: PipelineColuna;
  cards: BoardWorkPackageCard[];
  onOpenCard: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id, data: { colunaId: coluna.id } });

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-text">{coluna.nome}</h3>
        <span className="text-xs text-text-3">{cards.length}</span>
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
        {cards.length === 0 && (
          <EmptyState size="sm" title="Nenhum pacote" />
        )}
      </div>
    </div>
  );
}
