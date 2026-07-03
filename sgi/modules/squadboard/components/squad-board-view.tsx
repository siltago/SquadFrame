"use client";

import { useEffect, useState } from "react";
import { SquadBoardTopbar } from "@/modules/squadboard/components/layout/topbar";
import { KanbanBoard } from "@/modules/squadboard/components/kanban/board";
import { CardDetailDrawer } from "@/modules/squadboard/components/kanban/card-detail-drawer";
import { NewCardModal } from "@/modules/squadboard/components/kanban/new-card-modal";
import { CommandPalette } from "@/modules/squadboard/components/command-palette";
import type { Board, BoardCard } from "@/modules/squadboard/types/board";

export function SquadBoardView({ board, cardsIniciais }: { board: Board; cardsIniciais: BoardCard[] }) {
  const [cards, setCards] = useState<BoardCard[]>(cardsIniciais);
  const [cardAbertoId, setCardAbertoId] = useState<string | null>(null);
  const [novoCardColunaId, setNovoCardColunaId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const cardAberto = cards.find((c) => c.id === cardAbertoId) ?? null;
  const primeiraColunaId = [...board.colunas].sort((a, b) => a.ordem - b.ordem)[0]?.id;

  function criarCard(titulo: string, colunaId: string) {
    const nova: BoardCard = {
      id: `local-${Date.now()}`,
      colunaId,
      titulo,
      responsaveis: [],
      prioridade: "media",
      etiquetas: [],
      checklist: [],
      comentarios: [],
      timeline: [],
      anexos: [],
      ordem: cards.filter((c) => c.colunaId === colunaId).length,
    };
    setCards((prev) => [...prev, nova]);
  }

  return (
    <div className="flex h-screen flex-col">
      <SquadBoardTopbar
        onOpenSearch={() => setPaletteOpen(true)}
        onNovoCard={() => setNovoCardColunaId(primeiraColunaId ?? null)}
      />

      <div className="flex-1 overflow-hidden pt-4">
        <KanbanBoard
          board={board}
          cards={cards}
          onCardsChange={setCards}
          onOpenCard={setCardAbertoId}
          onAddCard={setNovoCardColunaId}
        />
      </div>

      <CardDetailDrawer
        card={cardAberto}
        open={!!cardAberto}
        onClose={() => setCardAbertoId(null)}
      />

      <NewCardModal
        open={!!novoCardColunaId}
        onClose={() => setNovoCardColunaId(null)}
        onCreate={(titulo) => novoCardColunaId && criarCard(titulo, novoCardColunaId)}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        cards={cards}
        onSelectCard={setCardAbertoId}
      />
    </div>
  );
}
