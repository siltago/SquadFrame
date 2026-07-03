"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/ui/components/Alert";
import { SquadBoardTopbar } from "@/modules/squadboard/components/layout/topbar";
import { PipelineSelector } from "@/modules/squadboard/components/pipeline-selector";
import { KanbanBoard } from "@/modules/squadboard/components/kanban/board";
import { CommandPalette } from "@/modules/squadboard/components/command-palette";
import { FiltrosBoardBar } from "@/modules/squadboard/components/filtros-board";
import { filtrarPacotes, FILTROS_VAZIOS, type FiltrosBoard } from "@/modules/squadboard/utils/filtrar-pacotes";
import { buscarPacotesBoard, moverPacotePipeline } from "@/modules/squadboard/actions/pacotes";
import { colunasDoPipeline, type PipelineId } from "@/modules/squadboard/types/pipeline";
import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";

export function SquadBoardView({
  pipelineInicial, pacotesIniciais,
}: {
  pipelineInicial: PipelineId;
  pacotesIniciais: BoardWorkPackageCard[];
}) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineId>(pipelineInicial);
  const [cards, setCards] = useState<BoardWorkPackageCard[]>(pacotesIniciais);
  const [filtros, setFiltros] = useState<FiltrosBoard>(FILTROS_VAZIOS);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoPipeline, startCarregandoPipeline] = useTransition();

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

  const cardsFiltrados = useMemo(() => filtrarPacotes(cards, filtros), [cards, filtros]);

  // Trocar de pipeline recarrega os Pacotes com a posição relativa a ESSE
  // pipeline — o mesmo conjunto de Pacotes, colunas diferentes.
  function trocarPipeline(novoPipeline: PipelineId) {
    if (novoPipeline === pipeline || carregandoPipeline) return;
    setErro(null);
    setFiltros(FILTROS_VAZIOS);
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

  // Persistência do drag: só afeta o pipeline atualmente selecionado (chave
  // única lote_id+pipeline em pacote_pipeline_status). Em caso de falha,
  // busca o estado real do servidor de novo em vez de manter o board
  // otimista divergente do banco.
  function handleColunaChange(cardId: string, novaColuna: string) {
    moverPacotePipeline(cardId, pipeline, novaColuna).catch(async (e) => {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a posição do card.");
      try {
        const pacotes = await buscarPacotesBoard(pipeline);
        setCards(pacotes);
      } catch {
        // mantém o estado otimista se o refetch também falhar
      }
    });
  }

  // Clicar num card leva para a tela real do pacote em Produção — sem tela
  // paralela, mesmo padrão já usado na integração Produção → Compras.
  function abrirPacote(id: string) {
    const pacote = cards.find((c) => c.id === id);
    if (pacote?.obraId) router.push(`/squadframe/obras/${pacote.obraId}?aba=producao`);
  }

  return (
    <div className="flex h-screen flex-col">
      <SquadBoardTopbar onOpenSearch={() => setPaletteOpen(true)} />

      <PipelineSelector pipeline={pipeline} onChange={trocarPipeline} disabled={carregandoPipeline} />

      <FiltrosBoardBar pacotes={cards} pipeline={pipeline} filtros={filtros} onChange={setFiltros} />

      {erro && (
        <div className="px-4 pt-2 sm:px-6">
          <Alert variant="danger" dismissible>{erro}</Alert>
        </div>
      )}

      <div className="flex-1 overflow-hidden pt-2">
        <KanbanBoard
          colunas={colunasDoPipeline(pipeline)}
          cards={cardsFiltrados}
          onCardsChange={setCards}
          onOpenCard={abrirPacote}
          onColunaChange={handleColunaChange}
        />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        cards={cards}
        onSelectCard={abrirPacote}
      />
    </div>
  );
}
