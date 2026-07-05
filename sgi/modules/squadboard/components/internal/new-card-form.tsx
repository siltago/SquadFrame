"use client";

import { useState, useTransition } from "react";
import { PlusIcon, CloseIcon } from "@/ui/icons";
import { criarCardInterno } from "@/modules/squadboard/actions/internal-board";
import type { Setor } from "@/modules/squadboard/types/internal-board";

export function NewCardButton({
  listaId,
  listaNome,
  setor,
  onCreated,
}: {
  listaId: string;
  listaNome: string;
  setor: Setor;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [, start] = useTransition();

  function submit() {
    const t = titulo.trim();
    if (!t) return;
    setTitulo("");
    setOpen(false);
    start(async () => {
      await criarCardInterno(setor, { listaId, titulo: t });
      onCreated();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Adicionar card em "${listaNome}"`}
        className="flex items-center justify-center h-6 w-6 rounded text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
      >
        <PlusIcon size={13} />
      </button>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-border bg-surface shadow-lg p-3 flex flex-col gap-2">
      <textarea
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Título do card..."
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
        autoFocus
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={!titulo.trim()}
          className="flex-1 rounded-lg py-1.5 text-xs font-medium bg-primary text-white disabled:opacity-50 transition-opacity"
        >
          Adicionar card
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
        >
          <CloseIcon size={13} />
        </button>
      </div>
    </div>
  );
}
