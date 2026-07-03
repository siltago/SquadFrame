"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { BoardCardItem } from "./board-card";
import type { Board, BoardCard } from "@/modules/squadboard/types/board";

export function KanbanBoard({
  board, cards, onCardsChange, onOpenCard, onAddCard,
}: {
  board: Board;
  cards: BoardCard[];
  onCardsChange: (updater: (prev: BoardCard[]) => BoardCard[]) => void;
  onOpenCard: (id: string) => void;
  onAddCard: (colunaId: string) => void;
}) {
  const setCards = onCardsChange;
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const colunasOrdenadas = [...board.colunas].sort((a, b) => a.ordem - b.ordem);

  function cardsDaColuna(colunaId: string) {
    return cards
      .filter((c) => c.colunaId === colunaId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  function handleDragStart(e: DragStartEvent) {
    const card = cards.find((c) => c.id === e.active.id);
    setActiveCard(card ?? null);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setCards((prev) => {
      const activeCardData = prev.find((c) => c.id === activeId);
      if (!activeCardData) return prev;

      const overCard = prev.find((c) => c.id === overId);
      const overColunaId = overCard ? overCard.colunaId : overId; // overId pode ser o id de uma coluna vazia

      if (activeCardData.colunaId === overColunaId) return prev;

      return prev.map((c) => (c.id === activeId ? { ...c, colunaId: overColunaId } : c));
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setCards((prev) => {
      const activeIdx = prev.findIndex((c) => c.id === activeId);
      const overIdx = prev.findIndex((c) => c.id === overId);
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return prev;
      return arrayMove(prev, activeIdx, overIdx).map((c, i) => ({ ...c, ordem: i }));
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:px-6 scrollbar-thin">
        {colunasOrdenadas.map((coluna) => (
          <BoardColumn
            key={coluna.id}
            coluna={coluna}
            cards={cardsDaColuna(coluna.id)}
            onOpenCard={onOpenCard}
            onAddCard={onAddCard}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-[1.5deg]">
            <BoardCardItem card={activeCard} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
