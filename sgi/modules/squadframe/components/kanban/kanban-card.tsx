"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { Tarefa } from "@/modules/squadframe/types/kanban";
import { PRIORIDADE_COR, ORIGEM_COR, ORIGEM_LABEL } from "@/modules/squadframe/types/kanban";
import { aceitarTarefa, excluirTarefa } from "@/modules/squadframe/actions/tarefas/actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tarefa: Tarefa;
  onClick: () => void;
}

function iniciaisNome(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function isOverdue(dataLimite: string | null): boolean {
  if (!dataLimite) return false;
  return new Date(dataLimite) < new Date(new Date().toDateString());
}

function formatDate(dataLimite: string): string {
  const [year, month, day] = dataLimite.split("-");
  return `${day}/${month}/${year}`;
}

export function KanbanCard({ tarefa, onClick }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarefa.id, data: { tarefa } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isFinalizado =
    tarefa.status === "CONCLUIDA" || tarefa.status === "CANCELADA";
  const overdue = isOverdue(tarefa.data_limite);
  const checkTotal = tarefa._checklist_total ?? 0;
  const checkDone = tarefa._checklist_done ?? 0;
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  function handleAceitar(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await aceitarTarefa(tarefa.id);
    });
  }

  function handleExcluir(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta tarefa?")) return;
    startTransition(async () => {
      await excluirTarefa(tarefa.id);
      router.refresh();
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative rounded-xl border border-border bg-surface p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all select-none ${
        isFinalizado ? "opacity-60" : ""
      }`}
    >
      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/squadframe/tarefas/${tarefa.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:text-primary hover:bg-bg transition-colors"
          title="Abrir em página dedicada"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </Link>
        <button
          onClick={handleExcluir}
          disabled={pending}
          className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:text-danger hover:bg-bg disabled:opacity-30 transition-colors"
          title="Excluir tarefa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <div
          className="shrink-0 w-1 rounded-full self-stretch"
          style={{ backgroundColor: PRIORIDADE_COR[tarefa.prioridade] }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text leading-snug line-clamp-2">
            {tarefa.titulo}
          </p>

          {tarefa.origem !== "MANUAL" && (
            <span
              className="mt-1.5 inline-block text-xs font-medium rounded-full px-2 py-0.5 text-white"
              style={{ backgroundColor: ORIGEM_COR[tarefa.origem] }}
            >
              {ORIGEM_LABEL[tarefa.origem]}
            </span>
          )}

          {tarefa.etiquetas && tarefa.etiquetas.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tarefa.etiquetas.map((et) => (
                <span
                  key={et.id}
                  className="text-xs rounded-full px-2 py-0.5 text-white font-medium"
                  style={{ backgroundColor: et.cor }}
                >
                  {et.nome}
                </span>
              ))}
            </div>
          )}

          {checkTotal > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-text-3">{checkDone}/{checkTotal}</span>
                <span className="text-xs text-text-3">{checkPct}%</span>
              </div>
              <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${checkPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {tarefa.responsavel ? (
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: "#0F4C81" }}
                  title={tarefa.responsavel.nome}
                >
                  {iniciaisNome(tarefa.responsavel.nome)}
                </div>
              ) : (
                <div className="flex h-6 items-center gap-1 rounded-full bg-bg px-2">
                  <div className="h-3 w-3 rounded-full bg-text-3/40" />
                  <span className="text-xs text-text-3">Sem dono</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {tarefa._tem_arquivos && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-3">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
              {tarefa._tem_links && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-3">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
              {tarefa.data_limite && (
                <span className={`text-xs font-medium ${overdue ? "text-danger" : "text-text-3"}`}>
                  {formatDate(tarefa.data_limite)}
                </span>
              )}
            </div>
          </div>

          {tarefa.status === "SEM_DONO" && !isFinalizado && (
            <button
              onClick={handleAceitar}
              disabled={pending}
              className="mt-2 w-full rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {pending ? "Aceitando..." : "Aceitar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
