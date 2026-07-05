"use client";

import { useState, useRef, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { CheckSquareIcon, TrashIcon, PlusIcon } from "@/ui/icons";
import {
  atualizarChecklist, deletarChecklist,
  criarItemChecklist, atualizarItemChecklist, deletarItemChecklist,
} from "@/modules/squadboard/actions/board-content";
import type { BoardChecklist, BoardChecklistItem } from "@/modules/squadboard/types/board-content";

function ChecklistItem({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: BoardChecklistItem;
  onToggle: () => void;
  onRename: (texto: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(item.texto);

  function salvar() {
    setEditing(false);
    const t = texto.trim();
    if (!t || t === item.texto) { setTexto(item.texto); return; }
    onRename(t);
  }

  return (
    <div className="group flex items-start gap-2.5 rounded-md px-1 py-1 hover:bg-surface-3 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={item.concluido}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors duration-[120ms] flex items-center justify-center",
          item.concluido
            ? "border-primary bg-primary"
            : "border-border bg-surface hover:border-primary/60",
        )}
      >
        {item.concluido && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </button>
      {editing ? (
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); salvar(); }
            if (e.key === "Escape") { setTexto(item.texto); setEditing(false); }
          }}
          className="flex-1 rounded border border-primary bg-surface px-1.5 py-0.5 text-sm text-text focus:outline-none"
          autoFocus
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 cursor-text text-sm leading-snug",
            item.concluido ? "text-text-3" : "text-text-2",
          )}
        >
          <span className="relative inline-block">
            {item.texto}
            {item.concluido && (
              <span className="absolute inset-x-0 border-t border-current" style={{ top: "50%" }} />
            )}
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-text-3 hover:text-danger transition-all"
        aria-label="Remover item"
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}

export function BoardChecklistSection({
  checklist,
  onUpdate,
  onDelete,
}: {
  checklist: BoardChecklist;
  onUpdate: (updated: BoardChecklist) => void;
  onDelete: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titulo, setTitulo] = useState(checklist.titulo);
  const [addingItem, setAddingItem] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const [, startTransition] = useTransition();
  const addInputRef = useRef<HTMLInputElement>(null);

  const concluidos = checklist.itens.filter((i) => i.concluido).length;
  const total = checklist.itens.length;
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  function salvarTitulo() {
    setEditingTitle(false);
    const t = titulo.trim();
    if (!t || t === checklist.titulo) { setTitulo(checklist.titulo); return; }
    onUpdate({ ...checklist, titulo: t });
    startTransition(() => atualizarChecklist(checklist.id, t));
  }

  function toggleItem(item: BoardChecklistItem) {
    const novas = checklist.itens.map((i) =>
      i.id === item.id ? { ...i, concluido: !i.concluido } : i,
    );
    onUpdate({ ...checklist, itens: novas });
    startTransition(() => atualizarItemChecklist(item.id, { concluido: !item.concluido }));
  }

  function renameItem(item: BoardChecklistItem, texto: string) {
    const novas = checklist.itens.map((i) => (i.id === item.id ? { ...i, texto } : i));
    onUpdate({ ...checklist, itens: novas });
    startTransition(() => atualizarItemChecklist(item.id, { texto }));
  }

  function removeItem(item: BoardChecklistItem) {
    onUpdate({ ...checklist, itens: checklist.itens.filter((i) => i.id !== item.id) });
    startTransition(() => deletarItemChecklist(item.id));
  }

  function handleAddItem() {
    const texto = novoItem.trim();
    if (!texto) { setAddingItem(false); return; }
    setNovoItem("");
    startTransition(async () => {
      const novo = await criarItemChecklist(checklist.id, texto);
      onUpdate({ ...checklist, itens: [...checklist.itens, novo] });
    });
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <CheckSquareIcon size={14} className="text-text-3 shrink-0" />
        {editingTitle ? (
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvarTitulo();
              if (e.key === "Escape") { setTitulo(checklist.titulo); setEditingTitle(false); }
            }}
            className="flex-1 rounded border border-primary bg-surface px-1.5 py-0.5 text-sm font-semibold text-text focus:outline-none"
            autoFocus
          />
        ) : (
          <p
            onClick={() => setEditingTitle(true)}
            className="flex-1 cursor-text text-[10px] font-semibold uppercase tracking-widest text-text-3 hover:text-text-2 transition-colors"
          >
            {checklist.titulo}
          </p>
        )}
        {total > 0 && (
          <span className="shrink-0 text-[11px] text-text-3">{concluidos}/{total}</span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-text-3 hover:text-danger transition-colors"
          aria-label="Deletar checklist"
        >
          <TrashIcon size={13} />
        </button>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      )}

      {/* Itens */}
      <div className="flex flex-col gap-0.5 mb-2">
        {checklist.itens.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={() => toggleItem(item)}
            onRename={(texto) => renameItem(item, texto)}
            onDelete={() => removeItem(item)}
          />
        ))}
      </div>

      {/* Add item */}
      {addingItem ? (
        <div className="flex flex-col gap-2">
          <input
            ref={addInputRef}
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
              if (e.key === "Escape") { setAddingItem(false); setNovoItem(""); }
            }}
            placeholder="Adicionar item…"
            className="field w-full text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!novoItem.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => { setAddingItem(false); setNovoItem(""); }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingItem(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
        >
          <PlusIcon size={12} />
          Adicionar item
        </button>
      )}
    </section>
  );
}
