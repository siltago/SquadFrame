"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { InternalCard } from "./internal-card";
import { ExpandedCard } from "./expanded-card";
import { NewCardButton } from "./new-card-form";
import type { InternalBoardColumn, InternalBoardCard, Setor } from "@/modules/squadboard/types/internal-board";

function SortableCard({
  card,
  setor,
  isExpanded,
  onOpen,
  onClose,
}: {
  card: InternalBoardCard;
  setor: Setor;
  isExpanded: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "internal-card", card }, disabled: isExpanded });

  if (isExpanded) {
    return (
      <div ref={setNodeRef}>
        {/* Mobile: modal sobre tela inteira */}
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-black/60" onClick={onClose}>
          <div
            className="mt-auto max-h-[92dvh] overflow-hidden rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ExpandedCard card={card} setor={setor} onClose={onClose} />
          </div>
        </div>
        {/* Desktop: inline na coluna */}
        <div className="hidden sm:block">
          <ExpandedCard card={card} setor={setor} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <InternalCard card={card} onClick={onOpen} />
    </div>
  );
}

export function InternalColumn({
  coluna,
  setor,
  expandedCardId,
  onOpenCard,
  onCloseCard,
  onCardCreated,
}: {
  coluna: InternalBoardColumn;
  setor: Setor;
  expandedCardId: string | null;
  onOpenCard: (card: InternalBoardCard) => void;
  onCloseCard: () => void;
  onCardCreated: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const isExpanded = coluna.cards.some((c) => c.id === expandedCardId);

  return (
    <div className={cn("shrink-0 flex flex-col gap-2 transition-all duration-300", isExpanded ? "w-[600px]" : "w-72")}>
      {/* Header */}
      <div className="relative flex items-center gap-2 px-1">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-text-3">
          {coluna.nome}
        </span>
        <span className="text-[11px] text-text-3">{coluna.cards.length}</span>
        <NewCardButton
          listaId={coluna.id}
          listaNome={coluna.nome}
          setor={setor}
          onCreated={onCardCreated}
        />
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-xl p-2 min-h-[80px] transition-colors",
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-surface-2",
        )}
      >
        <SortableContext
          items={coluna.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {coluna.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              setor={setor}
              isExpanded={expandedCardId === card.id}
              onOpen={() => onOpenCard(card)}
              onClose={onCloseCard}
            />
          ))}
        </SortableContext>

        {coluna.cards.length === 0 && (
          <p className="py-4 text-center text-xs text-text-3">Nenhum card</p>
        )}
      </div>
    </div>
  );
}
