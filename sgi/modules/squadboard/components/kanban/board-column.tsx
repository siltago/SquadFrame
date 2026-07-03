"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/ui/lib/cn";
import { ColumnHeader } from "@/ui/components/kanban";
import { EmptyState } from "@/ui/components/EmptyState";
import { BoardCardItem } from "./board-card";
import { BoardPedidoCardItem } from "./board-pedido-card";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { BoardPedidoCard } from "@/modules/squadboard/types/pedido";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

export function BoardColumn({
  coluna, cards, pedidos, onOpenCard, onOpenPedido,
}: {
  coluna: PipelineColuna;
  cards: BoardWorkPackageCard[];
  pedidos?: BoardPedidoCard[];
  onOpenCard: (id: string) => void;
  onOpenPedido?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id, data: { colunaId: coluna.id } });

  const allIds = [
    ...cards.map((c) => c.id),
    ...(pedidos ?? []).map((p) => p.id),
  ];

  const totalCount = cards.length + (pedidos?.length ?? 0);

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <ColumnHeader title={coluna.nome} count={totalCount} />

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-lg p-2 transition-colors duration-[120ms]",
          isOver ? "bg-surface-2" : "bg-transparent"
        )}
        style={{ minHeight: 40 }}
      >
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCardItem key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
          ))}
          {(pedidos ?? []).map((pedido) => (
            <BoardPedidoCardItem
              key={pedido.id}
              card={pedido}
              onOpen={() => onOpenPedido?.(pedido.id)}
            />
          ))}
        </SortableContext>

        {totalCount === 0 && (
          <EmptyState size="sm" title="Nenhum item" />
        )}
      </div>
    </div>
  );
}
