"use client";

import { useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { BoardCardItem } from "./board-card";
import { BoardPedidoCardItem } from "./board-pedido-card";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { BoardPedidoCard } from "@/modules/squadboard/types/pedido";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

type ActiveItem =
  | { kind: "pacote"; card: BoardWorkPackageCard }
  | { kind: "pedido"; card: BoardPedidoCard };

export function KanbanBoard({
  colunas, cards, pedidos, onCardsChange, onPedidosChange,
  onOpenCard, onColunaChange, onOpenPedido, onPedidoColunaChange,
}: {
  colunas: PipelineColuna[];
  cards: BoardWorkPackageCard[];
  pedidos?: BoardPedidoCard[];
  onCardsChange: (updater: (prev: BoardWorkPackageCard[]) => BoardWorkPackageCard[]) => void;
  onPedidosChange?: (updater: (prev: BoardPedidoCard[]) => BoardPedidoCard[]) => void;
  onOpenCard: (id: string) => void;
  onOpenPedido?: (id: string) => void;
  onColunaChange: (cardId: string, novaColuna: string) => void;
  onPedidoColunaChange?: (pedidoId: string, novaColuna: string) => void;
}) {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const colunaInicioRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function cardsDaColuna(colunaId: string) {
    return cards.filter((c) => c.coluna === colunaId);
  }

  function pedidosDaColuna(colunaId: string) {
    return (pedidos ?? []).filter((p) => p.coluna === colunaId);
  }

  function findKind(id: string): "pacote" | "pedido" {
    if ((pedidos ?? []).some((p) => p.id === id)) return "pedido";
    return "pacote";
  }

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    const kind = (e.active.data.current?.kind as "pacote" | "pedido") ?? findKind(id);
    if (kind === "pedido") {
      const card = (pedidos ?? []).find((p) => p.id === id) ?? null;
      setActiveItem(card ? { kind: "pedido", card } : null);
      colunaInicioRef.current = card?.coluna ?? null;
    } else {
      const card = cards.find((c) => c.id === id) ?? null;
      setActiveItem(card ? { kind: "pacote", card } : null);
      colunaInicioRef.current = card?.coluna ?? null;
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const kind = (active.data.current?.kind as "pacote" | "pedido") ?? findKind(activeId);

    if (kind === "pedido" && onPedidosChange) {
      onPedidosChange((prev) => {
        const item = prev.find((p) => p.id === activeId);
        if (!item) return prev;
        const overPedido = prev.find((p) => p.id === overId);
        const overCard = cards.find((c) => c.id === overId);
        const overColunaId = overPedido?.coluna ?? overCard?.coluna ?? overId;
        if (item.coluna === overColunaId) return prev;
        return prev.map((p) => (p.id === activeId ? { ...p, coluna: overColunaId } : p));
      });
    } else {
      onCardsChange((prev) => {
        const item = prev.find((c) => c.id === activeId);
        if (!item) return prev;
        const overCard = prev.find((c) => c.id === overId);
        const overPedido = (pedidos ?? []).find((p) => p.id === overId);
        const overColunaId = overCard?.coluna ?? overPedido?.coluna ?? overId;
        if (item.coluna === overColunaId) return prev;
        return prev.map((c) => (c.id === activeId ? { ...c, coluna: overColunaId } : c));
      });
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveItem(null);
    const colunaInicio = colunaInicioRef.current;
    colunaInicioRef.current = null;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const kind = (active.data.current?.kind as "pacote" | "pedido") ?? findKind(activeId);

    if (kind === "pedido" && onPedidosChange) {
      onPedidosChange((prev) => {
        const activeIdx = prev.findIndex((p) => p.id === activeId);
        const overIdx = prev.findIndex((p) => p.id === overId);
        const reordenado =
          activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx
            ? arrayMove(prev, activeIdx, overIdx)
            : prev;
        const itemFinal = reordenado.find((p) => p.id === activeId);
        if (itemFinal && colunaInicio !== null && itemFinal.coluna !== colunaInicio) {
          onPedidoColunaChange?.(activeId, itemFinal.coluna);
        }
        return reordenado;
      });
    } else {
      onCardsChange((prev) => {
        const activeIdx = prev.findIndex((c) => c.id === activeId);
        const overIdx = prev.findIndex((c) => c.id === overId);
        const reordenado =
          activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx
            ? arrayMove(prev, activeIdx, overIdx)
            : prev;
        const cardFinal = reordenado.find((c) => c.id === activeId);
        if (cardFinal && colunaInicio !== null && cardFinal.coluna !== colunaInicio) {
          onColunaChange(activeId, cardFinal.coluna);
        }
        return reordenado;
      });
    }
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
            pedidos={pedidosDaColuna(coluna.id)}
            onOpenCard={onOpenCard}
            onOpenPedido={onOpenPedido}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem?.kind === "pacote" && (
          <div className="rotate-[1.5deg]">
            <BoardCardItem card={activeItem.card} onOpen={() => {}} />
          </div>
        )}
        {activeItem?.kind === "pedido" && (
          <div className="rotate-[1.5deg]">
            <BoardPedidoCardItem card={activeItem.card} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
