"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
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
import type { Coluna, Tarefa } from "@/modules/squadframe/types/kanban";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { CardPanel } from "./card-panel";
import { NovaTarefaModal } from "./nova-tarefa-modal";
import { moverCard } from "@/modules/squadframe/actions/tarefas/actions";
import { createClient } from "@/shared/database/supabase-client";

interface Props {
  colunas: Coluna[];
  tarefas: Tarefa[];
  modo: "pessoal" | "setor";
  usuarioId?: string | null;
  setorId?: string | null;
}

export function KanbanBoard({ colunas, tarefas: tarefasIniciais, modo, usuarioId, setorId }: Props) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasIniciais);
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null);
  const [panelTarefaId, setPanelTarefaId] = useState<string | null>(null);
  const [novaTarefaColunaId, setNovaTarefaColunaId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTarefas(tarefasIniciais);
  }, [tarefasIniciais]);

  // Atualiza um card localmente sem re-fetch completo.
  // Preserva dados joined (responsavel, etiquetas) que não vêm no payload realtime.
  const atualizarCardLocal = useCallback((payload: Record<string, any>) => {
    setTarefas((prev) => {
      const exists = prev.some((t) => t.id === payload.id);
      if (!exists) return prev;

      return prev.map((t) => {
        if (t.id !== payload.id) return t;
        return {
          ...t,
          titulo:                 payload.titulo                 ?? t.titulo,
          status:                 payload.status                 ?? t.status,
          coluna_id:              payload.coluna_id              ?? t.coluna_id,
          ordem:                  payload.ordem                  ?? t.ordem,
          prioridade:             payload.prioridade             ?? t.prioridade,
          data_limite:            payload.data_limite,
          usuario_responsavel_id: payload.usuario_responsavel_id ?? t.usuario_responsavel_id,
          deleted_at:             payload.deleted_at,
          concluida_em:           payload.concluida_em           ?? t.concluida_em,
          aceita_em:              payload.aceita_em              ?? t.aceita_em,
          // Dados joined preservados — não vêm no payload realtime
          responsavel:      t.responsavel,
          etiquetas:        t.etiquetas,
          _checklist_total: t._checklist_total,
          _checklist_done:  t._checklist_done,
          _tem_arquivos:    t._tem_arquivos,
          _tem_links:       t._tem_links,
        };
      });
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Filtra por setor (modo setor) ou por responsável (modo pessoal).
    // Elimina ruído de outros setores/usuários — sem router.refresh() global.
    const filterStr = setorId
      ? `setor_id=eq.${setorId}`
      : usuarioId
        ? `usuario_responsavel_id=eq.${usuarioId}`
        : undefined;

    // Sufixo único por montagem — em dev, o StrictMode monta duas vezes
    // rapidamente; com o mesmo nome de tópico, o "leave" da primeira pode
    // não terminar no servidor antes do "join" da segunda, deixando a
    // inscrição "fantasma" (SUBSCRIBED no cliente, mas sem eventos de
    // verdade). Avaliado aqui dentro do efeito já garante um valor novo a
    // cada execução (uma por montagem).
    const channelName = `kanban-${setorId ?? usuarioId ?? "global"}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tarefas",
          ...(filterStr ? { filter: filterStr } : {}),
        },
        (payload) => {
          atualizarCardLocal(payload.new as Record<string, any>);
        }
      );
      // INSERT de nova tarefa é tratado pelo RealtimeRefresher da página pai

    // Em dev, o StrictMode roda esse efeito duas vezes rapidamente — a
    // primeira execução é sempre descartada. Adiar o subscribe por um tick
    // e checar se o efeito já foi cancelado evita mandar o join do servidor
    // pra montagem descartável, o que deixaria a segunda (a que fica de pé)
    // "fantasma" (SUBSCRIBED no cliente, sem eventos de verdade).
    let cancelado = false;
    const subscribeTimer = setTimeout(() => {
      if (!cancelado) channel.subscribe();
    }, 0);

    return () => {
      cancelado = true;
      clearTimeout(subscribeTimer);
      supabase.removeChannel(channel);
    };
  }, [setorId, usuarioId, atualizarCardLocal]);

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
          style={{ minHeight: "calc(100dvh - 120px)" }}
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
