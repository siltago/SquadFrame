"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { Avatar } from "@/ui/components/Avatar";
import { BoardCard, DragHandle } from "@/ui/components/kanban";
import { ClockIcon, CartIcon } from "@/ui/icons";
import { STATUS_LABEL_PEDIDO, type BoardPedidoCard, type StatusPedidoBoard } from "@/modules/squadboard/types/pedido";

// Cor da tarja topo do card por status
const STATUS_STRIP: Record<StatusPedidoBoard, string> = {
  RASCUNHO: "bg-border",
  AGUARDANDO_APROVACAO: "bg-warning",
  REJEITADO: "bg-danger",
  APROVADO: "bg-info",
  EMITIDO: "bg-info",
  AGUARDANDO_RECEBIMENTO: "bg-primary/60",
  RECEBIDO_PARCIAL: "bg-primary/40",
  RECEBIDO: "bg-primary",
  FINALIZADO: "bg-text-3/40",
};

// Cor do badge de status
const STATUS_BADGE: Record<StatusPedidoBoard, string> = {
  RASCUNHO: "text-text-3 bg-surface-3",
  AGUARDANDO_APROVACAO: "text-warning bg-warning/10",
  REJEITADO: "text-danger bg-danger/10",
  APROVADO: "text-info bg-info/10",
  EMITIDO: "text-info bg-info/10",
  AGUARDANDO_RECEBIMENTO: "text-primary bg-primary/10",
  RECEBIDO_PARCIAL: "text-primary bg-primary/10",
  RECEBIDO: "text-primary bg-primary/10",
  FINALIZADO: "text-text-3 bg-surface-3",
};

function formatarPrazo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const atrasado = d < new Date();
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { label, atrasado };
}

function formatarValor(valor: number | null) {
  if (valor == null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function BoardPedidoCardItem({
  card, onOpen,
}: {
  card: BoardPedidoCard;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { kind: "pedido", card },
  });

  const prazo = formatarPrazo(card.prazo);
  const valor = formatarValor(card.valorFinal);

  return (
    <BoardCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      isDragging={isDragging}
      onClick={onOpen}
      colorStrip={STATUS_STRIP[card.status]}
    >
      {/* Drag handle + número */}
      <div className="flex items-start gap-1.5">
        <DragHandle size="sm" className="mt-0.5 shrink-0" {...attributes} {...listeners} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-text leading-snug">{card.numero}</p>
            <span className={cn(
              "shrink-0 rounded px-1.5 py-px text-[10px] font-semibold",
              STATUS_BADGE[card.status],
            )}>
              {STATUS_LABEL_PEDIDO[card.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Fornecedor */}
      <p className="truncate text-xs font-medium text-text-2">{card.fornecedor}</p>

      {/* Obra (se houver) */}
      {card.obraNome && (
        <p className="truncate text-xs text-text-3">{card.obraNome}</p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2.5 text-text-3">
          <span className="flex items-center gap-1 text-[11px]" title="Pedido de compra">
            <CartIcon size={11} /> Compra
          </span>
          {prazo && (
            <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
              <ClockIcon size={11} />{prazo.label}
            </span>
          )}
          {valor && (
            <span className="text-[11px] text-text-3">{valor}</span>
          )}
        </div>
        {card.comprador && <Avatar name={card.comprador} size="sm" />}
      </div>
    </BoardCard>
  );
}
