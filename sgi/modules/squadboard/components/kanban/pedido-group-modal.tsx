"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import { ClockIcon, CartIcon, ExternalLinkIcon, CloseIcon } from "@/ui/icons";
import {
  STATUS_LABEL_PEDIDO,
  type BoardPedidoCard, type PedidoGrupo, type StatusPedidoBoard,
} from "@/modules/squadboard/types/pedido";
import { buscarEtiquetas, atribuirEtiquetaPedido, removerEtiquetaDePedido } from "@/modules/squadboard/actions/etiquetas";
import { LabelPicker } from "@/modules/squadboard/components/kanban/label-picker";
import { LabelsManager } from "@/modules/squadboard/components/labels-manager";
import type { BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";

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

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">
      {children}
    </p>
  );
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatarValor(valor: number | null) {
  if (valor == null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatarPrazo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
    atrasado: d < new Date(),
  };
}

function PedidoDetalhe({ pedido }: { pedido: BoardPedidoCard }) {
  const prazo = formatarPrazo(pedido.prazo);
  const valor = formatarValor(pedido.valorFinal);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text">{pedido.numero}</p>
        <span className={cn(
          "shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold",
          STATUS_BADGE[pedido.status],
        )}>
          {STATUS_LABEL_PEDIDO[pedido.status]}
        </span>
      </div>

      <div>
        <MetaLabel>Fornecedor</MetaLabel>
        <p className="text-sm text-text-2">{pedido.fornecedor}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {valor && (
          <div>
            <MetaLabel>Valor</MetaLabel>
            <p className="text-sm text-text-2">{valor}</p>
          </div>
        )}
        {prazo && (
          <div>
            <MetaLabel>Prazo de Entrega</MetaLabel>
            <p className={cn("text-sm", prazo.atrasado ? "text-danger font-medium" : "text-text-2")}>
              {prazo.atrasado && <span className="mr-1">⚠</span>}{prazo.label}
            </p>
          </div>
        )}
        <div>
          <MetaLabel>Criado em</MetaLabel>
          <p className="text-sm text-text-2">{formatarData(pedido.criadoEm)}</p>
        </div>
        {pedido.comprador && (
          <div>
            <MetaLabel>Responsável</MetaLabel>
            <div className="flex items-center gap-2">
              <Avatar name={pedido.comprador} size="sm" />
              <span className="text-sm text-text-2 truncate">{pedido.comprador}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PedidoGroupModal({
  grupo,
  open,
  onClose,
}: {
  grupo: PedidoGrupo | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [todasEtiquetas, setTodasEtiquetas] = useState<BoardEtiqueta[]>([]);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<BoardEtiqueta[]>([]);
  const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !grupo) return;
    // Etiquetas iniciais = união de todas as etiquetas dos pedidos do grupo
    const uniao = [...new Map(
      grupo.pedidos.flatMap((p) => p.etiquetas).map((e) => [e.id, e])
    ).values()];
    setEtiquetasSelecionadas(uniao);
    buscarEtiquetas().then(setTodasEtiquetas).catch(() => {});
  }, [open, grupo?.grupoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !labelsManagerOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, labelsManagerOpen]);

  if (!open || !grupo) return null;

  // Toggle aplica/remove a etiqueta em TODOS os pedidos do grupo
  function toggleEtiqueta(etiqueta: BoardEtiqueta) {
    const jaTem = etiquetasSelecionadas.some((e) => e.id === etiqueta.id);
    const novas = jaTem
      ? etiquetasSelecionadas.filter((e) => e.id !== etiqueta.id)
      : [...etiquetasSelecionadas, etiqueta];
    setEtiquetasSelecionadas(novas);
    const pedidos = grupo?.pedidos ?? [];
    startTransition(async () => {
      for (const p of pedidos) {
        if (jaTem) {
          await removerEtiquetaDePedido(p.id, etiqueta.id);
        } else {
          await atribuirEtiquetaPedido(p.id, etiqueta.id);
        }
      }
    });
  }

  const isSingle = grupo.pedidos.length === 1;
  const pedido = grupo.pedidos[0];

  const totalValor = grupo.pedidos.reduce((s, p) => s + (p.valorFinal ?? 0), 0);
  const compradores = [...new Set(grupo.pedidos.map((p) => p.comprador).filter(Boolean))] as string[];
  const prazos = grupo.pedidos
    .filter((p) => p.prazo)
    .map((p) => new Date(p.prazo!))
    .sort((a, b) => a.getTime() - b.getTime());
  const proximoPrazo = prazos[0] ? formatarPrazo(prazos[0].toISOString()) : null;
  const obraId = grupo.obraId;

  const titulo = isSingle && !grupo.obraId
    ? pedido.numero
    : grupo.obraNome ?? "Pedidos de Compra";

  const subtitulo = isSingle && !grupo.obraId
    ? pedido.fornecedor
    : `${grupo.pedidos.length} pedido${grupo.pedidos.length !== 1 ? "s" : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto scrollbar-thin p-4 py-10">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "sbFadeIn 120ms ease both" }}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-[860px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ animation: "sbSlideUp 150ms cubic-bezier(.16,1,.3,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          aria-label="Fechar"
        >
          <CloseIcon size={15} />
        </button>

        <div className="px-7 pt-6 pb-5 border-b border-border pr-12">
          <h2 className="text-lg font-semibold text-text leading-snug">{titulo}</h2>
          <p className="mt-1 text-sm text-text-3">{subtitulo}</p>
        </div>

        <div className="flex min-h-0">
          {/* Coluna principal */}
          <div className="flex-1 min-w-0 px-7 py-5 flex flex-col gap-4 overflow-y-auto scrollbar-thin max-h-[70vh]">
            <section>
              <MetaLabel>{isSingle ? "Detalhes do Pedido" : "Pedidos"}</MetaLabel>
              <div className="flex flex-col gap-3">
                {grupo.pedidos.map((p) => (
                  <PedidoDetalhe key={p.id} pedido={p} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-l border-border bg-surface-2 px-5 py-5 flex flex-col gap-5">

            {/* Etiquetas */}
            <div>
              <MetaLabel>Etiquetas</MetaLabel>
              {etiquetasSelecionadas.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {etiquetasSelecionadas.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleEtiqueta(e)}
                      title={`Remover "${e.nome}"`}
                      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white transition-opacity hover:opacity-75"
                      style={{ backgroundColor: e.cor }}
                    >
                      {e.nome}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ))}
                </div>
              )}
              <LabelPicker
                todas={todasEtiquetas}
                selecionadas={etiquetasSelecionadas}
                onToggle={toggleEtiqueta}
                onOpenManager={() => setLabelsManagerOpen(true)}
              />
            </div>

            {/* Valor total (apenas para grupos) */}
            {!isSingle && totalValor > 0 && (
              <div>
                <MetaLabel>Valor Total</MetaLabel>
                <p className="text-sm font-semibold text-text">{formatarValor(totalValor)}</p>
              </div>
            )}

            {/* Próximo prazo */}
            {proximoPrazo && (
              <div>
                <MetaLabel>Próx. Prazo</MetaLabel>
                <p className={cn(
                  "flex items-center gap-1.5 text-sm",
                  proximoPrazo.atrasado ? "text-danger font-medium" : "text-text-2",
                )}>
                  <ClockIcon size={13} />{proximoPrazo.label}
                </p>
              </div>
            )}

            {/* Compradores */}
            {compradores.length > 0 && (
              <div>
                <MetaLabel>{compradores.length > 1 ? "Responsáveis" : "Responsável"}</MetaLabel>
                <div className="flex flex-col gap-2">
                  {compradores.map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <Avatar name={c} size="sm" />
                      <span className="text-sm text-text-2 truncate">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Obra */}
            {grupo.obraNome && (
              <div>
                <MetaLabel>Obra</MetaLabel>
                <p className="text-sm text-text-2">{grupo.obraNome}</p>
              </div>
            )}

            {/* Pedidos por status (apenas grupo) */}
            {!isSingle && (
              <div>
                <MetaLabel>Por Status</MetaLabel>
                <div className="flex flex-col gap-1">
                  {[...new Set(grupo.pedidos.map((p) => p.status))].map((s) => {
                    const count = grupo.pedidos.filter((p) => p.status === s).length;
                    return (
                      <div key={s} className="flex items-center justify-between">
                        <span className={cn(
                          "rounded px-1.5 py-px text-[10px] font-semibold",
                          STATUS_BADGE[s],
                        )}>
                          {STATUS_LABEL_PEDIDO[s]}
                        </span>
                        <span className="text-[11px] text-text-3">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="mt-auto pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-text-2"
                onClick={() => {
                  onClose();
                  if (obraId) {
                    router.push(`/squadframe/obras/${obraId}?aba=compras`);
                  } else {
                    router.push(`/squadframe/compras/pedidos`);
                  }
                }}
              >
                <ExternalLinkIcon size={13} />
                Ver em Compras
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes sbFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sbSlideUp { from { opacity: 0; transform: translateY(10px) scale(0.98) } to { opacity: 1; transform: none } }
      `}</style>

      <LabelsManager
        open={labelsManagerOpen}
        onClose={() => setLabelsManagerOpen(false)}
        onEtiquetasChange={() => buscarEtiquetas().then(setTodasEtiquetas).catch(() => {})}
      />
    </div>
  );
}
