"use client";

import { useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { BoardCardItem } from "./board-card";
import { BoardPedidoGroupCard } from "./board-pedido-group";
import { agruparPedidos } from "@/modules/squadboard/utils/agrupar-pedidos";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { BoardPedidoCard, PedidoGrupo } from "@/modules/squadboard/types/pedido";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

type ActiveItem =
  | { kind: "pacote"; card: BoardWorkPackageCard }
  | { kind: "pedido-grupo"; grupo: PedidoGrupo };

export function KanbanBoard({
  colunas, cards, pedidos, onCardsChange, onPedidosChange,
  onOpenCard, onOpenGroup, onColunaChange, onOrdemChange, onPedidoGroupColunaChange,
}: {
  colunas: PipelineColuna[];
  cards: BoardWorkPackageCard[];
  pedidos?: BoardPedidoCard[];
  onCardsChange: (updater: (prev: BoardWorkPackageCard[]) => BoardWorkPackageCard[]) => void;
  onPedidosChange?: (updater: (prev: BoardPedidoCard[]) => BoardPedidoCard[]) => void;
  onOpenCard: (id: string) => void;
  onOpenGroup?: (grupo: PedidoGrupo) => void;
  onColunaChange: (cardId: string, novaColuna: string) => void;
  onOrdemChange?: (coluna: string, ids: string[]) => void;
  onPedidoGroupColunaChange?: (pedidoIds: string[], novaColuna: string) => void;
}) {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const colunaInicioRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Mapa grupoId → grupo para lookup rápido em drag handlers
  const grupoMap = new Map<string, PedidoGrupo>();
  for (const coluna of colunas) {
    const pedidosColuna = (pedidos ?? []).filter((p) => p.coluna === coluna.id);
    for (const grupo of agruparPedidos(pedidosColuna)) {
      grupoMap.set(grupo.grupoId, grupo);
    }
  }

  function findKind(id: string): "pacote" | "pedido-grupo" {
    if (grupoMap.has(id)) return "pedido-grupo";
    return "pacote";
  }

  function resolveOverColuna(overId: string): string {
    // over pode ser um colunaId, um cardId ou um grupoId
    if (colunas.some((c) => c.id === overId)) return overId;
    const overCard = cards.find((c) => c.id === overId);
    if (overCard) return overCard.coluna;
    const overGrupo = grupoMap.get(overId);
    if (overGrupo) return overGrupo.coluna;
    const overPedido = (pedidos ?? []).find((p) => p.id === overId);
    if (overPedido) return overPedido.coluna;
    return overId;
  }

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    const kind = (e.active.data.current?.kind as string) ?? findKind(id);

    if (kind === "pedido-grupo") {
      const grupo = grupoMap.get(id) ?? (e.active.data.current?.grupo as PedidoGrupo | undefined);
      setActiveItem(grupo ? { kind: "pedido-grupo", grupo } : null);
      colunaInicioRef.current = grupo?.coluna ?? null;
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

    const kind = (active.data.current?.kind as string) ?? findKind(activeId);
    const novaColuna = resolveOverColuna(overId);

    if (kind === "pedido-grupo" && onPedidosChange) {
      const grupo = grupoMap.get(activeId) ?? (active.data.current?.grupo as PedidoGrupo | undefined);
      if (!grupo || grupo.coluna === novaColuna) return;
      const grupoIds = new Set(grupo.pedidos.map((p) => p.id));
      onPedidosChange((prev) =>
        prev.map((p) => (grupoIds.has(p.id) ? { ...p, coluna: novaColuna } : p)),
      );
    } else if (kind === "pacote") {
      onCardsChange((prev) => {
        const item = prev.find((c) => c.id === activeId);
        if (!item || item.coluna === novaColuna) return prev;
        return prev.map((c) => (c.id === activeId ? { ...c, coluna: novaColuna } : c));
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
    const kind = (active.data.current?.kind as string) ?? findKind(activeId);

    if (kind === "pedido-grupo" && onPedidosChange) {
      const grupo = active.data.current?.grupo as PedidoGrupo | undefined ?? grupoMap.get(activeId);
      if (!grupo) return;
      const grupoIds = new Set(grupo.pedidos.map((p) => p.id));

      onPedidosChange((prev) => {
        // Reordena os itens do grupo dentro da lista
        const outGroup = prev.filter((p) => !grupoIds.has(p.id));
        const inGroup = prev.filter((p) => grupoIds.has(p.id));
        const finalList = [...outGroup, ...inGroup];
        const finalColuna = inGroup[0]?.coluna ?? colunaInicio;
        if (finalColuna && colunaInicio && finalColuna !== colunaInicio) {
          onPedidoGroupColunaChange?.(inGroup.map((p) => p.id), finalColuna);
        }
        return finalList;
      });
    } else if (kind === "pacote") {
      onCardsChange((prev) => {
        const activeIdx = prev.findIndex((c) => c.id === activeId);
        const overIdx = prev.findIndex((c) => c.id === overId);
        const reordenado =
          activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx
            ? arrayMove(prev, activeIdx, overIdx)
            : prev;
        const cardFinal = reordenado.find((c) => c.id === activeId);
        if (cardFinal) {
          if (colunaInicio !== null && cardFinal.coluna !== colunaInicio) {
            onColunaChange(activeId, cardFinal.coluna);
          }
          const idsColuna = reordenado
            .filter((c) => c.coluna === cardFinal.coluna)
            .map((c) => c.id);
          onOrdemChange?.(cardFinal.coluna, idsColuna);
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
            cards={cards.filter((c) => c.coluna === coluna.id)}
            pedidos={(pedidos ?? []).filter((p) => p.coluna === coluna.id)}
            onOpenCard={onOpenCard}
            onOpenGroup={onOpenGroup}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem?.kind === "pacote" && (
          <div className="rotate-[1.5deg]">
            <BoardCardItem card={activeItem.card} onOpen={() => {}} />
          </div>
        )}
        {activeItem?.kind === "pedido-grupo" && (
          <div className="rotate-[1.5deg]">
            <BoardPedidoGroupCard grupo={activeItem.grupo} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
