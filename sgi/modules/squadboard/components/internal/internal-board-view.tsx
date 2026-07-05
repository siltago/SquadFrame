"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { AlertTriangleIcon, SettingsIcon } from "@/ui/icons";
import Link from "next/link";
import {
  buscarColunasPorSetor,
  atualizarColunasEmBackground,
  moverCardInterno,
} from "@/modules/squadboard/actions/internal-board";
import { InternalKanbanBoard } from "./internal-board";
import { SquadBoardTopbar } from "@/modules/squadboard/components/layout/topbar";
import type {
  InternalBoardCard, InternalBoardColumn, Setor,
} from "@/modules/squadboard/types/internal-board";
import { SETORES } from "@/modules/squadboard/types/internal-board";

interface InternalBoardViewProps {
  setorInicial: Setor;
  colunasIniciais: InternalBoardColumn[];
  staleInicial: boolean;
  configurado: boolean;
  initialCardId?: string;
}

export function InternalBoardView({
  setorInicial,
  colunasIniciais,
  staleInicial,
  configurado,
  initialCardId,
}: InternalBoardViewProps) {
  const [setor, setSetor] = useState<Setor>(setorInicial);
  const [colunas, setColunas] = useState<InternalBoardColumn[]>(colunasIniciais);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(initialCardId ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [semConfig, setSemConfig] = useState(!configurado);
  const [carregando, startTransition] = useTransition();

  // Background refresh quando dados chegam stale do servidor
  useEffect(() => {
    if (!staleInicial) return;
    atualizarColunasEmBackground(setorInicial).then((fresh) => {
      if (fresh.length > 0) setColunas(fresh);
    }).catch(() => {});
  }, [staleInicial, setorInicial]);

  function trocarSetor(novoSetor: Setor) {
    if (novoSetor === setor) return;
    setErro(null);
    setExpandedCardId(null);
    startTransition(async () => {
      try {
        const { colunas: novasColunas, stale } = await buscarColunasPorSetor(novoSetor);
        setSetor(novoSetor);
        setColunas(novasColunas);
        setSemConfig(novasColunas.length === 0);
        if (stale) {
          atualizarColunasEmBackground(novoSetor).then((fresh) => {
            if (fresh.length > 0) setColunas(fresh);
          }).catch(() => {});
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar setor.");
      }
    });
  }

  function handleColunaChange(cardId: string, novaListaId: string) {
    setExpandedCardId(null);
    startTransition(async () => {
      try {
        await moverCardInterno(cardId, novaListaId, setor);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao mover card.");
        const { colunas: refreshed } = await buscarColunasPorSetor(setor);
        setColunas(refreshed);
      }
    });
  }

  function handleOpenCard(card: InternalBoardCard) {
    setExpandedCardId((prev) => (prev === card.id ? null : card.id));
  }

  function handleCardCreated() {
    startTransition(async () => {
      try {
        const { colunas: novasColunas } = await buscarColunasPorSetor(setor);
        setColunas(novasColunas);
      } catch {/* silently ignore */}
    });
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col h-screen overflow-hidden">
      <SquadBoardTopbar onOpenSearch={() => {}} />

      {/* Setor tabs */}
      <div className="flex items-center gap-0 border-b border-border px-6">
        {SETORES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => trocarSetor(s.id)}
            disabled={carregando}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-[120ms]",
              setor === s.id
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-2 hover:border-border",
            )}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <Link
          href="/squadboard/configuracoes"
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
        >
          <SettingsIcon size={13} />
          Configurar
        </Link>
      </div>

      {/* Erros */}
      {erro && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangleIcon size={15} />
          {erro}
          <button onClick={() => setErro(null)} className="ml-auto text-danger/60 hover:text-danger">✕</button>
        </div>
      )}

      {/* Sem configuração */}
      {semConfig && !erro && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
            <SettingsIcon size={24} className="text-text-3" />
          </div>
          <div>
            <p className="font-semibold text-text">Setor não configurado</p>
            <p className="mt-1 text-sm text-text-3">
              Configure o Board do Trello para este setor nas configurações.
            </p>
          </div>
          <Link
            href="/squadboard/configuracoes"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Configurar agora
          </Link>
        </div>
      )}

      {/* Board */}
      {!semConfig && (
        <div className="flex-1 overflow-hidden">
          {carregando ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : (
            <InternalKanbanBoard
              colunas={colunas}
              setor={setor}
              expandedCardId={expandedCardId}
              onColunasChange={setColunas}
              onColunaChange={handleColunaChange}
              onOpenCard={handleOpenCard}
              onCloseCard={() => setExpandedCardId(null)}
              onCardCreated={handleCardCreated}
            />
          )}
        </div>
      )}
    </div>
  );
}
