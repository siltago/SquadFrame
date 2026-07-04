"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/ui/lib/cn";
import { Avatar } from "@/ui/components/Avatar";
import { BoardCard, DragHandle } from "@/ui/components/kanban";
import { ClockIcon, CartIcon } from "@/ui/icons";
import {
  STATUS_LABEL_PEDIDO,
  type BoardPedidoCard, type PedidoGrupo, type StatusPedidoBoard,
} from "@/modules/squadboard/types/pedido";

const STATUS_STRIP: Record<StatusPedidoBoard, string> = {
  REJEITADO: "bg-danger",
  AGUARDANDO_APROVACAO: "bg-warning",
  RASCUNHO: "bg-border",
  APROVADO: "bg-info",
  EMITIDO: "bg-info",
  AGUARDANDO_RECEBIMENTO: "bg-primary/60",
  RECEBIDO_PARCIAL: "bg-primary/40",
  RECEBIDO: "bg-primary",
  FINALIZADO: "bg-text-3/40",
};

const STATUS_BADGE: Record<StatusPedidoBoard, string> = {
  REJEITADO: "text-danger bg-danger/10",
  AGUARDANDO_APROVACAO: "text-warning bg-warning/10",
  RASCUNHO: "text-text-3 bg-surface-3",
  APROVADO: "text-info bg-info/10",
  EMITIDO: "text-info bg-info/10",
  AGUARDANDO_RECEBIMENTO: "text-primary bg-primary/10",
  RECEBIDO_PARCIAL: "text-primary bg-primary/10",
  RECEBIDO: "text-primary bg-primary/10",
  FINALIZADO: "text-text-3 bg-surface-3",
};

const STATUS_URGENCIA: Record<StatusPedidoBoard, number> = {
  REJEITADO: 8, AGUARDANDO_APROVACAO: 7, RASCUNHO: 6,
  APROVADO: 5, EMITIDO: 4,
  AGUARDANDO_RECEBIMENTO: 3, RECEBIDO_PARCIAL: 2,
  RECEBIDO: 1, FINALIZADO: 0,
};

function worstStatus(pedidos: BoardPedidoCard[]): StatusPedidoBoard {
  return pedidos.reduce(
    (worst, p) => STATUS_URGENCIA[p.status] > STATUS_URGENCIA[worst] ? p.status : worst,
    pedidos[0].status,
  );
}

function nextPrazo(pedidos: BoardPedidoCard[]) {
  const sorted = pedidos
    .filter((p) => p.prazo)
    .map((p) => new Date(p.prazo!))
    .sort((a, b) => a.getTime() - b.getTime());
  if (!sorted.length) return null;
  const d = sorted[0];
  return {
    label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    atrasado: d < new Date(),
  };
}

function formatarValor(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function BoardPedidoGroupCard({
  grupo,
  onOpen,
}: {
  grupo: PedidoGrupo;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: grupo.grupoId,
    data: { kind: "pedido-grupo", grupo },
  });

  const isSingle = grupo.pedidos.length === 1 && grupo.obraId === null;
  const pedido = grupo.pedidos[0];
  const worst = worstStatus(grupo.pedidos);
  const prazo = nextPrazo(grupo.pedidos);
  const totalValor = grupo.pedidos.reduce((s, p) => s + (p.valorFinal ?? 0), 0);
  const compradores = [...new Set(grupo.pedidos.map((p) => p.comprador).filter(Boolean))] as string[];

  // Etiquetas únicas do grupo (união de todos os pedidos)
  const todasEtiquetas = grupo.pedidos.flatMap((p) => p.etiquetas);
  const etiquetasUnicas = [...new Map(todasEtiquetas.map((e) => [e.id, e])).values()];

  // Card individual: pedido sem obra
  if (isSingle) {
    const singleStrip = pedido.etiquetas.length === 0 ? STATUS_STRIP[pedido.status] : undefined;
    return (
      <BoardCard
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        isDragging={isDragging}
        onClick={onOpen}
        colorStrip={singleStrip}
      >
        <div className="flex items-start gap-1.5">
          <DragHandle size="sm" className="mt-0.5 shrink-0" {...attributes} {...listeners} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-text leading-snug">{pedido.numero}</p>
              <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-semibold", STATUS_BADGE[pedido.status])}>
                {STATUS_LABEL_PEDIDO[pedido.status]}
              </span>
            </div>
          </div>
        </div>

        <p className="truncate text-xs font-medium text-text-2">{pedido.fornecedor}</p>

        {pedido.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pedido.etiquetas.map((e) => (
              <span key={e.id} title={e.nome} className="h-2 w-7 rounded-full" style={{ backgroundColor: e.cor }} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2.5 text-text-3">
            <span className="flex items-center gap-1 text-[11px]"><CartIcon size={11} /> Compra</span>
            {prazo && (
              <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
                <ClockIcon size={11} />{prazo.label}
              </span>
            )}
            {totalValor > 0 && <span className="text-[11px]">{formatarValor(totalValor)}</span>}
          </div>
          {pedido.comprador && <Avatar name={pedido.comprador} size="sm" />}
        </div>
      </BoardCard>
    );
  }

  // Card de grupo: obra com múltiplos pedidos
  const grupoStrip = etiquetasUnicas.length === 0 ? STATUS_STRIP[worst] : undefined;
  return (
    <BoardCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      isDragging={isDragging}
      onClick={onOpen}
      colorStrip={grupoStrip}
    >
      {/* Header: drag handle + nome da obra + contador */}
      <div className="flex items-start gap-1.5">
        <div onClick={(e) => e.stopPropagation()}>
          <DragHandle size="sm" className="mt-0.5 shrink-0" {...attributes} {...listeners} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text leading-snug truncate">
              {grupo.obraNome ?? "Sem Obra"}
            </p>
            <span className="shrink-0 rounded-full bg-surface-3 px-2 py-px text-[11px] font-semibold text-text-3">
              {grupo.pedidos.length}
            </span>
          </div>
        </div>
      </div>

      {etiquetasUnicas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {etiquetasUnicas.map((e) => (
            <span key={e.id} title={e.nome} className="h-2 w-7 rounded-full" style={{ backgroundColor: e.cor }} />
          ))}
        </div>
      )}

      {/* Ícone + valor total */}
      <div className="flex items-center gap-2 text-[11px] text-text-3">
        <CartIcon size={11} />
        <span>Pedidos de compra</span>
        {totalValor > 0 && <span className="ml-auto font-medium text-text-2">{formatarValor(totalValor)}</span>}
      </div>

      {/* Rodapé: prazo + avatares */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {prazo ? (
          <span className={cn("flex items-center gap-1 text-[11px]", prazo.atrasado ? "text-danger" : "text-text-3")}>
            <ClockIcon size={11} />{prazo.label}
          </span>
        ) : <span />}
        <div className="flex -space-x-1.5">
          {compradores.slice(0, 3).map((c) => (
            <Avatar key={c} name={c} size="sm" />
          ))}
        </div>
      </div>
    </BoardCard>
  );
}
