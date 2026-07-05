"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { InternalColumn } from "./internal-column";
import { InternalCard } from "./internal-card";
import type {
  InternalBoardCard, InternalBoardColumn, Setor,
} from "@/modules/squadboard/types/internal-board";

interface InternalKanbanBoardProps {
  colunas: InternalBoardColumn[];
  setor: Setor;
  expandedCardId: string | null;
  onColunasChange: (colunas: InternalBoardColumn[]) => void;
  onColunaChange: (cardId: string, novaListaId: string) => void;
  onOpenCard: (card: InternalBoardCard) => void;
  onCloseCard: () => void;
  onCardCreated: () => void;
}

export function InternalKanbanBoard({
  colunas,
  setor,
  expandedCardId,
  onColunasChange,
  onColunaChange,
  onOpenCard,
  onCloseCard,
  onCardCreated,
}: InternalKanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<InternalBoardCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findColuna(cardId: string): InternalBoardColumn | undefined {
    return colunas.find((c) => c.cards.some((card) => card.id === cardId));
  }

  function handleDragStart({ active }: DragStartEvent) {
    const col = findColuna(active.id as string);
    const card = col?.cards.find((c) => c.id === active.id);
    setActiveCard(card ?? null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const sourceCol = findColuna(active.id as string);
    if (!sourceCol) return;

    const destCol = findColuna(over.id as string) ?? colunas.find((c) => c.id === over.id);
    if (!destCol || sourceCol.id === destCol.id) return;

    onColunasChange(
      colunas.map((col) => {
        if (col.id === sourceCol.id) {
          return { ...col, cards: col.cards.filter((c) => c.id !== active.id) };
        }
        if (col.id === destCol.id) {
          const card = sourceCol.cards.find((c) => c.id === active.id)!;
          return { ...col, cards: [...col.cards, { ...card, colunaId: col.id, coluna: col.nome }] };
        }
        return col;
      }),
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    if (!over) return;

    const sourceCol = findColuna(active.id as string);
    if (!sourceCol) return;

    const destCol = findColuna(over.id as string) ?? colunas.find((c) => c.id === over.id);
    if (!destCol) return;

    if (sourceCol.id === destCol.id) {
      const oldIdx = sourceCol.cards.findIndex((c) => c.id === active.id);
      const newIdx = sourceCol.cards.findIndex((c) => c.id === over.id);
      if (oldIdx !== newIdx) {
        onColunasChange(
          colunas.map((col) =>
            col.id === sourceCol.id
              ? { ...col, cards: arrayMove(col.cards, oldIdx, newIdx) }
              : col,
          ),
        );
      }
    } else {
      onColunaChange(active.id as string, destCol.id);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-6 h-full scrollbar-thin">
        {colunas.map((col) => (
          <InternalColumn
            key={col.id}
            coluna={col}
            setor={setor}
            expandedCardId={expandedCardId}
            onOpenCard={onOpenCard}
            onCloseCard={onCloseCard}
            onCardCreated={onCardCreated}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard && (
          <div className="rotate-[1.5deg] opacity-95 shadow-xl">
            <InternalCard card={activeCard} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
