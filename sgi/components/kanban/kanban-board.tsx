"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import type { Coluna, Tarefa } from "@/types/kanban";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { CardPanel } from "./card-panel";
import { NovaTarefaModal } from "./nova-tarefa-modal";
import { moverCard } from "@/app/tarefas/actions";
import { createClient } from "@/lib/supabase-client";

interface Props {
  colunas: Coluna[];
  tarefas: Tarefa[];
  modo: "pessoal" | "setor";
  usuarioId?: string | null;
  setorId?: string | null;
}

export function KanbanBoard({ colunas, tarefas: tarefasIniciais, modo, usuarioId, setorId }: Props) {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasIniciais);
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null);
  const [panelTarefaId, setPanelTarefaId] = useState<string | null>(null);
  const [novaTarefaColunaId, setNovaTarefaColunaId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTarefas(tarefasIniciais);
  }, [tarefasIniciais]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kanban-board-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function getTarefasDaColuna(colunaId: string): Tarefa[] {
    return tarefas
      .filter((t) => t.coluna_id === colunaId && !t.deleted_at)
      .sort((a, b) => a.ordem - b.ordem);
  }

  function handleDragStart(event: DragStartEvent) {
    const tarefa = tarefas.find((t) => t.id === event.active.id);
    setActiveTarefa(tarefa ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTar = tarefas.find((t) => t.id === activeId);
    if (!activeTar) return;

    const isOverColuna = colunas.some((c) => c.id === overId);
    const overTarefa = tarefas.find((t) => t.id === overId);
    const destinoColunaId = isOverColuna ? overId : overTarefa?.coluna_id;

    if (!destinoColunaId || destinoColunaId === activeTar.coluna_id) return;

    setTarefas((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, coluna_id: destinoColunaId } : t
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTarefa(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTar = tarefas.find((t) => t.id === activeId);
    if (!activeTar) return;

    const isOverColuna = colunas.some((c) => c.id === overId);
    const overTarefa = tarefas.find((t) => t.id === overId);
    const destinoColunaId = isOverColuna ? overId : (overTarefa?.coluna_id ?? activeTar.coluna_id);

    const tarefasDestino = tarefas
      .filter((t) => t.coluna_id === destinoColunaId && !t.deleted_at)
      .sort((a, b) => a.ordem - b.ordem);

    let novaOrdem = 0;
    if (!isOverColuna && overTarefa) {
      const overIdx = tarefasDestino.findIndex((t) => t.id === overId);
      const activeIdx = tarefasDestino.findIndex((t) => t.id === activeId);
      const reordenado = arrayMove(tarefasDestino, activeIdx === -1 ? tarefasDestino.length : activeIdx, overIdx);
      novaOrdem = reordenado.findIndex((t) => t.id === activeId);
    } else {
      novaOrdem = tarefasDestino.length;
    }

    setTarefas((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, coluna_id: destinoColunaId, ordem: novaOrdem } : t
      )
    );

    if (destinoColunaId) {
      startTransition(async () => {
        await moverCard(activeId, destinoColunaId, novaOrdem);
      });
    }
  }

  const colSemDono = colunas[0];

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 120px)" }}
        >
          {colunas.map((coluna) => (
            <KanbanColumn
              key={coluna.id}
              coluna={coluna}
              tarefas={getTarefasDaColuna(coluna.id)}
              onNovaTarefa={() => setNovaTarefaColunaId(coluna.id)}
              onCardClick={(id) => setPanelTarefaId(id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTarefa ? (
            <div style={{ transform: "rotate(2deg)", opacity: 0.95 }}>
              <KanbanCard tarefa={activeTarefa} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {novaTarefaColunaId && (
        <NovaTarefaModal
          colunaId={novaTarefaColunaId}
          setorId={setorId ?? null}
          usuarioId={usuarioId ?? null}
          onClose={() => setNovaTarefaColunaId(null)}
        />
      )}

      {panelTarefaId && (
        <CardPanel
          tarefaId={panelTarefaId}
          onClose={() => setPanelTarefaId(null)}
        />
      )}
    </>
  );
}
