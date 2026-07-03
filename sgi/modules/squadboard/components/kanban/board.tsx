"use client";

import { useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { BoardCardItem } from "./board-card";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

// Drag-and-drop persiste apenas dentro do pipeline sendo exibido: mover um
// card muda `coluna` localmente (feedback imediato) e, ao soltar, dispara
// `onColunaChange` só se a coluna final for diferente da inicial — quem
// decide como persistir (e em qual pipeline) é o chamador (SquadBoardView),
// este componente não sabe nada sobre pipelines além da lista de colunas.
export function KanbanBoard({
  colunas, cards, onCardsChange, onOpenCard, onColunaChange,
}: {
  colunas: PipelineColuna[];
  cards: BoardWorkPackageCard[];
  onCardsChange: (updater: (prev: BoardWorkPackageCard[]) => BoardWorkPackageCard[]) => void;
  onOpenCard: (id: string) => void;
  onColunaChange: (cardId: string, novaColuna: string) => void;
}) {
  const setCards = onCardsChange;
  const [activeCard, setActiveCard] = useState<BoardWorkPackageCard | null>(null);
  const colunaInicioRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function cardsDaColuna(colunaId: string) {
    return cards.filter((c) => c.coluna === colunaId);
  }

  function handleDragStart(e: DragStartEvent) {
    const card = cards.find((c) => c.id === e.active.id);
    setActiveCard(card ?? null);
    colunaInicioRef.current = card?.coluna ?? null;
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
      const overColunaId = overCard ? overCard.coluna : overId; // overId pode ser o id de uma coluna vazia

      if (activeCardData.coluna === overColunaId) return prev;

      return prev.map((c) => (c.id === activeId ? { ...c, coluna: overColunaId } : c));
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveCard(null);
    if (!over) {
      colunaInicioRef.current = null;
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const colunaInicio = colunaInicioRef.current;
    colunaInicioRef.current = null;

    setCards((prev) => {
      const activeIdx = prev.findIndex((c) => c.id === activeId);
      const overIdx = prev.findIndex((c) => c.id === overId);
      const reordenado = activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx
        ? arrayMove(prev, activeIdx, overIdx)
        : prev;

      const cardFinal = reordenado.find((c) => c.id === activeId);
      if (cardFinal && colunaInicio !== null && cardFinal.coluna !== colunaInicio) {
        onColunaChange(activeId, cardFinal.coluna);
      }

      return reordenado;
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
        {colunas.map((coluna) => (
          <BoardColumn
            key={coluna.id}
            coluna={coluna}
            cards={cardsDaColuna(coluna.id)}
            onOpenCard={onOpenCard}
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
