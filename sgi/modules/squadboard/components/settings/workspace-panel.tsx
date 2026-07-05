"use client";

import { useState, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { CheckIcon, ChevronDownIcon, AlertTriangleIcon } from "@/ui/icons";
import {
  buscarBoardsDisponiveis,
  configurarBoardParaSetor,
  removerBoardParaSetor,
  inicializarWorkspaceInterno,
} from "@/modules/squadboard/actions/settings";
import type { Workspace } from "@/modules/squadboard/types/workspace";
import type { Setor } from "@/modules/squadboard/types/internal-board";
import { SETORES } from "@/modules/squadboard/types/internal-board";

interface SetorRowProps {
  setor: Setor;
  label: string;
  currentBoardId: string | null;
  currentBoardNome: string | null;
  boards: { id: string; nome: string }[];
  onSave: (boardId: string, boardNome: string) => void;
  onRemove: () => void;
}

function SetorRow({
  setor, label, currentBoardId, currentBoardNome, boards, onSave, onRemove,
}: SetorRowProps) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(currentBoardId ?? "");
  const [saving, startSave] = useTransition();

  function handleSave() {
    if (!selected) return;
    const board = boards.find((b) => b.id === selected);
    if (!board) return;
    startSave(async () => {
      await configurarBoardParaSetor(setor, board.id, board.nome);
      onSave(board.id, board.nome);
      setEditing(false);
    });
  }

  function handleRemove() {
    startSave(async () => {
      await removerBoardParaSetor(setor);
      onRemove();
      setEditing(false);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text w-24 shrink-0">{label}</span>

        {!editing ? (
          <>
            {currentBoardNome ? (
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <CheckIcon size={13} className="text-green-500 shrink-0" />
                <span className="truncate text-xs text-text-2">{currentBoardNome}</span>
              </div>
            ) : (
              <span className="flex-1 text-xs text-text-3">Não configurado</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-2 hover:border-primary/40 hover:text-text transition-colors"
            >
              {currentBoardId ? "Alterar" : "Configurar"}
            </button>
          </>
        ) : (
          <>
            <div className="relative flex-1 min-w-0">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-1.5 pr-8 text-xs text-text focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um board…</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
              <ChevronDownIcon size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={!selected || saving}
                className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
              {currentBoardId && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="rounded-md border border-danger/30 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
                >
                  Remover
                </button>
              )}
              <button
                type="button"
                onClick={() => { setEditing(false); setSelected(currentBoardId ?? ""); }}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-3 hover:text-text transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Workspace Panel ───────────────────────────────────────────────────

export function WorkspacePanel({ workspace: wsInicial }: { workspace: Workspace | null }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(wsInicial);
  const [boards, setBoards] = useState<{ id: string; nome: string }[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [inicializando, startInit] = useTransition();
  const [carregandoBoards, startLoadBoards] = useTransition();

  function inicializar() {
    startInit(async () => {
      try {
        await inicializarWorkspaceInterno();
        // Recarregar a página para refletir o novo workspace
        window.location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao inicializar workspace.");
      }
    });
  }

  function carregarBoards() {
    if (boards !== null) return;
    startLoadBoards(async () => {
      try {
        const lista = await buscarBoardsDisponiveis();
        setBoards(lista);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao buscar boards.");
      }
    });
  }

  if (!workspace) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold text-text">Workspace Interno</h2>
        <p className="mb-4 text-xs text-text-3">
          O workspace interno ainda não foi inicializado. Clique abaixo para criar os setores padrão.
        </p>
        {erro && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <AlertTriangleIcon size={13} className="mt-0.5 shrink-0" />
            {erro}
          </div>
        )}
        <button
          type="button"
          onClick={inicializar}
          disabled={inicializando}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {inicializando ? "Inicializando…" : "Inicializar Workspace"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Workspace Interno</h2>
        <button
          type="button"
          onClick={carregarBoards}
          disabled={carregandoBoards || boards !== null}
          className={cn(
            "text-xs text-text-3 hover:text-text transition-colors",
            (boards !== null || carregandoBoards) && "opacity-50 pointer-events-none",
          )}
        >
          {carregandoBoards ? "Carregando boards…" : boards !== null ? "Boards carregados" : "Carregar boards do Trello"}
        </button>
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          <AlertTriangleIcon size={13} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      )}

      {boards === null && !carregandoBoards && (
        <p className="mb-3 text-[11px] text-text-3">
          Carregue a lista de boards do Trello para configurar cada setor.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {SETORES.map((s) => {
          const sector = workspace.sectors.find((sec) => sec.nome === s.id);
          const activeBoard = sector?.boards.find((b) => b.ativo) ?? null;

          return (
            <SetorRow
              key={s.id}
              setor={s.id}
              label={s.label}
              currentBoardId={activeBoard?.providerBoardId ?? null}
              currentBoardNome={activeBoard?.providerBoardNome ?? null}
              boards={boards ?? []}
              onSave={(boardId, boardNome) => {
                setWorkspace((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    sectors: prev.sectors.map((sec) => {
                      if (sec.nome !== s.id) return sec;
                      const updatedBoards = sec.boards.map((b) => ({ ...b, ativo: false }));
                      const existing = updatedBoards.find((b) => b.providerBoardId === boardId);
                      if (existing) {
                        return { ...sec, boards: updatedBoards.map((b) => b.providerBoardId === boardId ? { ...b, ativo: true, providerBoardNome: boardNome } : b) };
                      }
                      return {
                        ...sec,
                        boards: [...updatedBoards, {
                          id: crypto.randomUUID(),
                          sectorId: sec.id,
                          providerBoardId: boardId,
                          providerBoardNome: boardNome,
                          label: boardNome,
                          ordem: 1,
                          ativo: true,
                          listConfig: null,
                          ultimoSync: null,
                        }],
                      };
                    }),
                  };
                });
              }}
              onRemove={() => {
                setWorkspace((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    sectors: prev.sectors.map((sec) =>
                      sec.nome === s.id
                        ? { ...sec, boards: sec.boards.map((b) => ({ ...b, ativo: false })) }
                        : sec,
                    ),
                  };
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
