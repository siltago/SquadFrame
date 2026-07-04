"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/ui/lib/cn";
import { ColumnHeader } from "@/ui/components/kanban";
import { EmptyState } from "@/ui/components/EmptyState";
import { BoardCardItem } from "./board-card";
import { BoardPedidoGroupCard } from "./board-pedido-group";
import { agruparPedidos } from "@/modules/squadboard/utils/agrupar-pedidos";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { BoardPedidoCard, PedidoGrupo } from "@/modules/squadboard/types/pedido";
import type { PipelineColuna } from "@/modules/squadboard/types/pipeline";

export function BoardColumn({
  coluna, cards, pedidos, onOpenCard, onOpenGroup,
}: {
  coluna: PipelineColuna;
  cards: BoardWorkPackageCard[];
  pedidos?: BoardPedidoCard[];
  onOpenCard: (id: string) => void;
  onOpenGroup?: (grupo: PedidoGrupo) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id, data: { colunaId: coluna.id } });

  const grupos = agruparPedidos(pedidos ?? []);
  const totalCount = cards.length + grupos.length;

  const allIds = [
    ...cards.map((c) => c.id),
    ...grupos.map((g) => g.grupoId),
  ];

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <ColumnHeader title={coluna.nome} count={totalCount} />

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-lg p-2 transition-colors duration-[120ms]",
          isOver ? "bg-surface-2" : "bg-transparent",
        )}
        style={{ minHeight: 40 }}
      >
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCardItem key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
          ))}
          {grupos.map((grupo) => (
            <BoardPedidoGroupCard
              key={grupo.grupoId}
              grupo={grupo}
              onOpen={() => onOpenGroup?.(grupo)}
            />
          ))}
        </SortableContext>

        {totalCount === 0 && <EmptyState size="sm" title="Nenhum item" />}
      </div>
    </div>
  );
}
