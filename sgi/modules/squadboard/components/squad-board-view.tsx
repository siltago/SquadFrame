"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert } from "@/ui/components/Alert";
import { SquadBoardTopbar } from "@/modules/squadboard/components/layout/topbar";
import { PipelineSelector } from "@/modules/squadboard/components/pipeline-selector";
import { KanbanBoard } from "@/modules/squadboard/components/kanban/board";
import { CommandPalette } from "@/modules/squadboard/components/command-palette";
import { PackageCardModal } from "@/modules/squadboard/components/kanban/package-card-modal";
import { PedidoGroupModal } from "@/modules/squadboard/components/kanban/pedido-group-modal";
import { buscarPacotesBoard, moverPacotePipeline, salvarOrdemColuna } from "@/modules/squadboard/actions/pacotes";
import { buscarPedidosCompras, moverGrupoPedidosBoard } from "@/modules/squadboard/actions/pedidos-board";
import { colunasDoPipeline, type PipelineId } from "@/modules/squadboard/types/pipeline";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";
import type { BoardPedidoCard, PedidoGrupo } from "@/modules/squadboard/types/pedido";

export function SquadBoardView({
  pipelineInicial, pacotesIniciais,
}: {
  pipelineInicial: PipelineId;
  pacotesIniciais: BoardWorkPackageCard[];
}) {
  const [pipeline, setPipeline] = useState<PipelineId>(pipelineInicial);
  const [cards, setCards] = useState<BoardWorkPackageCard[]>(pacotesIniciais);
  const [pedidos, setPedidos] = useState<BoardPedidoCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BoardWorkPackageCard | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PedidoGrupo | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoPipeline, startCarregandoPipeline] = useTransition();

  // Carrega pedidos sempre que o pipeline for Compras
  useEffect(() => {
    if (pipeline !== "compras") { setPedidos([]); return; }
    buscarPedidosCompras().then(setPedidos).catch(() => setPedidos([]));
  }, [pipeline]);

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

  function trocarPipeline(novoPipeline: PipelineId) {
    if (novoPipeline === pipeline || carregandoPipeline) return;
    setErro(null);
    startCarregandoPipeline(async () => {
      try {
        const pacotes = await buscarPacotesBoard(novoPipeline);
        setPipeline(novoPipeline);
        setCards(pacotes);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível carregar este pipeline.");
      }
    });
  }

  function handleColunaChange(cardId: string, novaColuna: string) {
    moverPacotePipeline(cardId, pipeline, novaColuna).catch(async (e) => {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a posição do card.");
      try { setCards(await buscarPacotesBoard(pipeline)); } catch { /* mantém estado otimista */ }
    });
  }

  function handleOrdemChange(coluna: string, ids: string[]) {
    salvarOrdemColuna(pipeline, coluna, ids).catch(() => {});
  }

  function handlePedidoGroupColunaChange(pedidoIds: string[], novaColuna: string) {
    moverGrupoPedidosBoard(pedidoIds, novaColuna).catch(async (e) => {
      setErro(e instanceof Error ? e.message : "Não foi possível mover o pedido.");
      try { setPedidos(await buscarPedidosCompras()); } catch { /* mantém estado otimista */ }
    });
  }

  function abrirCard(id: string) {
    const card = cards.find((c) => c.id === id);
    if (card) setSelectedCard(card);
  }

  function handleCardUpdated(updated: Partial<BoardWorkPackageCard> & { id: string }) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setSelectedCard((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }

  return (
    <div className="flex h-screen flex-col">
      <SquadBoardTopbar onOpenSearch={() => setPaletteOpen(true)} />

      <PipelineSelector pipeline={pipeline} onChange={trocarPipeline} disabled={carregandoPipeline} />

      {erro && (
        <div className="px-4 pt-2 sm:px-6">
          <Alert variant="danger" dismissible>{erro}</Alert>
        </div>
      )}

      <div className="flex-1 overflow-hidden pt-2">
        <KanbanBoard
          colunas={colunasDoPipeline(pipeline)}
          cards={cards}
          pedidos={pipeline === "compras" ? pedidos : undefined}
          onCardsChange={setCards}
          onPedidosChange={setPedidos}
          onOpenCard={abrirCard}
          onOpenGroup={(grupo) => setSelectedGroup(grupo)}
          onColunaChange={handleColunaChange}
          onOrdemChange={handleOrdemChange}
          onPedidoGroupColunaChange={handlePedidoGroupColunaChange}
        />
      </div>

      <PackageCardModal
        card={selectedCard}
        open={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        onCardUpdated={handleCardUpdated}
      />

      <PedidoGroupModal
        grupo={selectedGroup}
        open={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        cards={cards}
        onSelectCard={abrirCard}
      />
    </div>
  );
}
