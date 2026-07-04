"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Button } from "@/ui/components/Button";
import { Avatar } from "@/ui/components/Avatar";
import {
  ClockIcon, LayersIcon, DocumentIcon, CartIcon,
  ExternalLinkIcon, CloseIcon,
} from "@/ui/icons";
import { PriorityIndicator } from "@/ui/components/kanban";
import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";
import type { PriorityLevel } from "@/ui/components/kanban";
import { PIPELINES, type PipelineId } from "@/modules/squadboard/types/pipeline";
import { buscarStatusPipelines, atualizarPacote } from "@/modules/squadboard/actions/pacotes";
import { buscarEtiquetas, buscarEtiquetasDoPacote, atribuirEtiqueta, removerEtiquetaDoPacote } from "@/modules/squadboard/actions/etiquetas";
import { LabelPicker } from "@/modules/squadboard/components/kanban/label-picker";
import { LabelsManager } from "@/modules/squadboard/components/labels-manager";
import type { BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";

const PRIORITY_MAP: Record<PrioridadePacote, PriorityLevel> = {
  baixa: "low", media: "medium", alta: "high", critica: "critical",
};

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">
      {children}
    </p>
  );
}

export function PackageCardModal({
  card,
  open,
  onClose,
  onCardUpdated,
}: {
  card: BoardWorkPackageCard | null;
  open: boolean;
  onClose: () => void;
  onCardUpdated: (updated: Partial<BoardWorkPackageCard> & { id: string }) => void;
}) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState<Record<PipelineId, string> | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [todasEtiquetas, setTodasEtiquetas] = useState<BoardEtiqueta[]>([]);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<BoardEtiqueta[]>([]);
  const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Carrega status de todos os pipelines + etiquetas quando abre
  useEffect(() => {
    if (!open || !card) return;
    setNomeRascunho(card.nome);
    setEditingTitle(false);
    setPipelineStatus(null);
    setLoadingStatus(true);
    setEtiquetasSelecionadas(card.etiquetas ?? []);

    Promise.all([
      buscarStatusPipelines(card.id),
      buscarEtiquetas(),
      buscarEtiquetasDoPacote(card.id),
    ]).then(([status, todas, selecionadas]) => {
      setPipelineStatus(status);
      setTodasEtiquetas(todas);
      setEtiquetasSelecionadas(selecionadas);
    }).catch(() => {}).finally(() => setLoadingStatus(false));
  }, [open, card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Foca no input de título quando entra em modo edição
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
      // Auto-resize
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [editingTitle]);

  // Escape fecha, scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !editingTitle) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, editingTitle]);

  if (!open || !card) return null;

  function salvarNome() {
    if (!card) return;
    const nome = nomeRascunho.trim();
    setEditingTitle(false);
    if (!nome || nome === card.nome) return;
    startTransition(async () => {
      await atualizarPacote(card.id, { nome });
      onCardUpdated({ id: card.id, nome });
    });
  }

  function salvarPrioridade(val: string) {
    if (!card) return;
    const prioridade = (val || null) as PrioridadePacote | null;
    startTransition(async () => {
      await atualizarPacote(card.id, { prioridade });
      onCardUpdated({ id: card.id, prioridade });
    });
  }

  function salvarPrazo(val: string) {
    if (!card) return;
    const prazo = val || null;
    startTransition(async () => {
      await atualizarPacote(card.id, { prazo });
      onCardUpdated({ id: card.id, prazo });
    });
  }

  function toggleEtiqueta(etiqueta: BoardEtiqueta) {
    if (!card) return;
    const jaSelecionada = etiquetasSelecionadas.some((e) => e.id === etiqueta.id);
    const novas = jaSelecionada
      ? etiquetasSelecionadas.filter((e) => e.id !== etiqueta.id)
      : [...etiquetasSelecionadas, etiqueta];
    setEtiquetasSelecionadas(novas);
    onCardUpdated({ id: card.id, etiquetas: novas });
    startTransition(async () => {
      if (jaSelecionada) {
        await removerEtiquetaDoPacote(card.id, etiqueta.id);
      } else {
        await atribuirEtiqueta(card.id, etiqueta.id);
      }
    });
  }

  const prazoDate = card.prazo ? new Date(card.prazo) : null;
  const prazoAtrasado = prazoDate ? prazoDate < new Date() : false;
  const prazoValue = card.prazo ? card.prazo.slice(0, 10) : "";

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
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          aria-label="Fechar"
        >
          <CloseIcon size={15} />
        </button>

        {/* Header — Título + Obra */}
        <div className="px-7 pt-6 pb-5 border-b border-border pr-12">
          {editingTitle ? (
            <textarea
              ref={titleRef}
              value={nomeRascunho}
              rows={1}
              onChange={(e) => {
                setNomeRascunho(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onBlur={salvarNome}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); salvarNome(); }
                if (e.key === "Escape") { setNomeRascunho(card.nome); setEditingTitle(false); }
              }}
              className="w-full resize-none overflow-hidden bg-surface-2 border border-primary rounded-md px-2.5 py-1.5 text-lg font-semibold text-text focus:outline-none"
            />
          ) : (
            <h2
              className="text-lg font-semibold text-text cursor-text hover:bg-surface-2 rounded px-1 -mx-1 py-0.5 transition-colors leading-snug"
              onClick={() => setEditingTitle(true)}
              title="Clique para editar"
            >
              {card.nome}
            </h2>
          )}

          <p className="mt-1.5 text-sm text-text-3">
            Obra:{" "}
            <span className="font-medium text-text-2">{card.obraNome}</span>
          </p>
        </div>

        {/* Body — 2 colunas */}
        <div className="flex min-h-0">
          {/* Coluna principal */}
          <div className="flex-1 min-w-0 px-7 py-5 flex flex-col gap-6">

            {/* Status nos 3 pipelines */}
            <section>
              <MetaLabel>Status nos Pipelines</MetaLabel>

              {loadingStatus ? (
                <div className="flex flex-col gap-2.5">
                  {PIPELINES.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 h-5">
                      <span className="w-24 h-3 rounded bg-surface-3 animate-pulse shrink-0" />
                      <span className="flex-1 h-2 rounded-full bg-surface-3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {PIPELINES.map((p) => {
                    const colunaId = pipelineStatus?.[p.id] ?? p.colunas[0].id;
                    const colunaIdx = p.colunas.findIndex((c) => c.id === colunaId);
                    const colunaNome = p.colunas[colunaIdx]?.nome ?? p.colunas[0].nome;

                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-text-3">{p.nome}</span>
                        <div className="flex flex-1 items-center gap-1">
                          {p.colunas.map((c, i) => (
                            <div
                              key={c.id}
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                i <= colunaIdx ? "bg-primary" : "bg-surface-3",
                              )}
                              title={c.nome}
                            />
                          ))}
                        </div>
                        <span className="w-28 shrink-0 text-xs font-medium text-text-2 text-right">
                          {colunaNome}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Progresso */}
            {card.contadores.tipologias > 0 && (
              <section>
                <MetaLabel>Progresso</MetaLabel>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${card.progresso}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold text-text-2">
                    {card.progresso}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-3">
                  <span className="flex items-center gap-1.5">
                    <LayersIcon size={12} />
                    {card.contadores.tipologias} tipologia{card.contadores.tipologias !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DocumentIcon size={12} />
                    {card.contadores.solicitacoes} solicitaç{card.contadores.solicitacoes !== 1 ? "ões" : "ão"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CartIcon size={12} />
                    {card.contadores.pedidos} pedido{card.contadores.pedidos !== 1 ? "s" : ""}
                  </span>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-l border-border bg-surface-2 px-5 py-5 flex flex-col gap-5">

            {/* Etiquetas */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Etiquetas</p>
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

            {/* Prioridade */}
            <div>
              <MetaLabel>Prioridade</MetaLabel>
              {card.prioridade && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PriorityIndicator level={PRIORITY_MAP[card.prioridade]} showLabel />
                </div>
              )}
              <select
                value={card.prioridade ?? ""}
                onChange={(e) => salvarPrioridade(e.target.value)}
                disabled={isPending}
                className="field w-full"
              >
                <option value="">Sem prioridade</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            {/* Prazo */}
            <div>
              <MetaLabel>Prazo</MetaLabel>
              {prazoAtrasado && (
                <p className="mb-1 flex items-center gap-1 text-[11px] text-danger">
                  <ClockIcon size={11} /> Atrasado
                </p>
              )}
              <input
                type="date"
                value={prazoValue}
                onChange={(e) => salvarPrazo(e.target.value)}
                disabled={isPending}
                className={cn("field w-full", prazoAtrasado && "text-danger")}
              />
            </div>

            {/* Responsável */}
            <div>
              <MetaLabel>Responsável</MetaLabel>
              {card.responsavel ? (
                <div className="flex items-center gap-2">
                  <Avatar name={card.responsavel} size="sm" />
                  <span className="text-sm text-text-2 truncate">{card.responsavel}</span>
                </div>
              ) : (
                <p className="text-sm text-text-3">Não atribuído</p>
              )}
            </div>

            {/* Criado em */}
            <div>
              <MetaLabel>Criado em</MetaLabel>
              <p className="text-sm text-text-2">
                {new Date(card.criadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Ações */}
            <div className="mt-auto pt-1 flex flex-col gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-text-2"
                onClick={() => {
                  onClose();
                  router.push(`/squadframe/obras/${card.obraId}?aba=producao`);
                }}
              >
                <ExternalLinkIcon size={13} />
                Ver em SquadFrame
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
        onEtiquetasChange={() => {
          buscarEtiquetas().then(setTodasEtiquetas).catch(() => {});
        }}
      />
    </div>
  );
}
