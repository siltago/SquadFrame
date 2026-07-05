"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { cn } from "@/ui/lib/cn";
import { PlusIcon, TrashIcon, CheckSquareIcon } from "@/ui/icons";
import {
  toggleCheckItemInterno,
  criarChecklist,
  renomearChecklist,
  excluirChecklist,
  criarItemChecklist,
  atualizarItemChecklist,
  excluirItemChecklist,
} from "@/modules/squadboard/actions/internal-board";
import { useUsuario } from "@/modules/squadframe/components/user-provider";
import {
  buscarUsuariosSquadSystem,
  type SquadUsuario,
} from "@/modules/squadboard/actions/squadsystem";
import type {
  InternalChecklist, InternalChecklistItem, Setor,
} from "@/modules/squadboard/types/internal-board";

// ── Mention autocomplete ───────────────────────────────────────────────

type MentionState = { at: number; query: string } | null;

function detectMention(value: string, cursor: number): MentionState {
  const before = value.slice(0, cursor);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return null;
  // Only active if there are no spaces between @ and cursor
  const fragment = before.slice(atIdx + 1);
  if (fragment.includes(" ")) return null;
  return { at: atIdx, query: fragment };
}

function MentionDropdown({
  usuarios,
  query,
  onSelect,
}: {
  usuarios: SquadUsuario[];
  query: string;
  onSelect: (usuario: SquadUsuario) => void;
}) {
  const filtered = query
    ? usuarios.filter((u) => u.nome.toLowerCase().includes(query.toLowerCase()))
    : usuarios.slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute left-0 top-full z-30 mt-0.5 w-44 rounded-lg border border-border bg-surface shadow-xl py-1 max-h-40 overflow-y-auto">
      {filtered.map((u) => (
        <button
          key={u.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus on input
            onSelect(u);
          }}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-2 transition-colors"
        >
          {u.avatar ? (
            <img src={u.avatar} className="h-4 w-4 rounded-full object-cover shrink-0" alt={u.nome} />
          ) : (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
              {u.nome.charAt(0)}
            </span>
          )}
          <span className="flex-1 truncate text-[11px] text-text">{u.nome}</span>
        </button>
      ))}
    </div>
  );
}

// ── Check item ─────────────────────────────────────────────────────────

function CheckItemRow({
  item,
  checklistId,
  cardId,
  cardTitulo,
  setor,
  usuarios,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: InternalChecklistItem;
  checklistId: string;
  cardId: string;
  cardTitulo: string;
  setor: Setor;
  usuarios: SquadUsuario[];
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, texto: string, responsavel?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(item.texto);
  const [mention, setMention] = useState<MentionState>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();
  const usuario = useUsuario();

  function toggle() {
    onToggle(item.id, !item.concluido);
    start(() => toggleCheckItemInterno(cardId, item.id, !item.concluido, setor));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTexto(val);
    const cursor = e.target.selectionStart ?? val.length;
    setMention(detectMention(val, cursor));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") { setEditing(false); setMention(null); }
  }

  function selectMention(u: SquadUsuario) {
    if (!mention) return;
    const firstName = u.nome.split(" ")[0].toLowerCase();
    const before = texto.slice(0, mention.at);
    const after = texto.slice(mention.at + 1 + mention.query.length);
    const newText = `${before}@${firstName}${after ? ` ${after.trimStart()}` : ""}`;
    setTexto(newText);
    setMention(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveEdit() {
    setEditing(false);
    setMention(null);
    const t = texto.trim();
    if (!t || (t === item.texto && !item.responsavel)) {
      setTexto(item.texto);
      return;
    }
    // Extract @mention from text for the responsavel field
    const mentionMatch = t.match(/@(\S+)/);
    const responsavel = mentionMatch ? mentionMatch[1] : item.responsavel;
    onUpdate(item.id, t, responsavel);
    start(() => atualizarItemChecklist(checklistId, item.id, cardId, t, setor, {
      cardTitulo,
      autorNome: usuario?.nome ?? undefined,
    }));
  }

  function deleteItem() {
    onDelete(item.id);
    start(() => excluirItemChecklist(checklistId, item.id, cardId, setor));
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface-3 transition-colors">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors flex items-center justify-center",
          item.concluido
            ? "border-primary bg-primary"
            : "border-border hover:border-primary/60 bg-surface",
        )}
      >
        {item.concluido && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0 relative">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={handleChange}
              onBlur={() => { if (!mention) saveEdit(); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-surface-2 border border-primary/40 rounded px-2 py-0.5 text-xs text-text focus:outline-none"
              autoFocus
            />
            {mention && (
              <MentionDropdown
                usuarios={usuarios}
                query={mention.query}
                onSelect={selectMention}
              />
            )}
          </>
        ) : (
          <span
            onClick={() => { setTexto(item.texto); setEditing(true); }}
            className={cn(
              "cursor-text text-xs leading-snug",
              item.concluido ? "text-text-3" : "text-text-2",
            )}
          >
            <span className={cn(item.concluido && "line-through")}>
              {item.texto}
            </span>
            {item.responsavel && (
              <span className="ml-1.5 text-[11px] text-primary font-medium">@{item.responsavel}</span>
            )}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={deleteItem}
        className="shrink-0 mt-0.5 hidden group-hover:flex text-text-3 hover:text-danger transition-colors"
      >
        <TrashIcon size={11} />
      </button>
    </div>
  );
}

// ── Add item form (also supports @mention) ─────────────────────────────

function AddItemForm({
  checklistId,
  cardId,
  cardTitulo,
  setor,
  usuarios,
  onAdd,
}: {
  checklistId: string;
  cardId: string;
  cardTitulo: string;
  setor: Setor;
  usuarios: SquadUsuario[];
  onAdd: (item: InternalChecklistItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [mention, setMention] = useState<MentionState>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();
  const usuario = useUsuario();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTexto(val);
    const cursor = e.target.selectionStart ?? val.length;
    setMention(detectMention(val, cursor));
  }

  function selectMention(u: SquadUsuario) {
    if (!mention) return;
    const firstName = u.nome.split(" ")[0].toLowerCase();
    const before = texto.slice(0, mention.at);
    const after = texto.slice(mention.at + 1 + mention.query.length);
    const newText = `${before}@${firstName}${after ? ` ${after.trimStart()}` : ""}`;
    setTexto(newText);
    setMention(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submit() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    setMention(null);
    setOpen(false);
    start(async () => {
      const item = await criarItemChecklist(checklistId, cardId, t, setor, {
        cardTitulo,
        autorNome: usuario?.nome ?? undefined,
      });
      onAdd(item);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-text-3 hover:text-text transition-colors mt-1 px-1"
      >
        <PlusIcon size={11} />
        Adicionar item
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={handleChange}
          onKeyDown={(e) => { if (e.key === "Enter" && !mention) submit(); if (e.key === "Escape") { setOpen(false); setMention(null); } }}
          placeholder="Novo item… (@ para mencionar alguém)"
          className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
          autoFocus
        />
        {mention && (
          <MentionDropdown
            usuarios={usuarios}
            query={mention.query}
            onSelect={selectMention}
          />
        )}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={!texto.trim()}
          className="rounded px-2.5 py-1 text-[11px] font-medium bg-primary text-white disabled:opacity-50 transition-opacity"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setMention(null); }}
          className="rounded px-2.5 py-1 text-[11px] text-text-3 hover:text-text transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Single checklist ───────────────────────────────────────────────────

function ChecklistBlock({
  checklist: initial,
  cardId,
  cardTitulo,
  setor,
  usuarios,
  onDelete,
}: {
  checklist: InternalChecklist;
  cardId: string;
  cardTitulo: string;
  setor: Setor;
  usuarios: SquadUsuario[];
  onDelete: (id: string) => void;
}) {
  const [cl, setCl] = useState(initial);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titulo, setTitulo] = useState(initial.titulo);
  const [, start] = useTransition();

  const done = cl.itens.filter((i) => i.concluido).length;
  const total = cl.itens.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function saveTitle() {
    setEditingTitle(false);
    const t = titulo.trim();
    if (!t || t === cl.titulo) return;
    setCl((c) => ({ ...c, titulo: t }));
    start(() => renomearChecklist(cl.id, t, setor));
  }

  function toggleItem(id: string, isDone: boolean) {
    setCl((c) => ({
      ...c,
      itens: c.itens.map((it) => (it.id === id ? { ...it, concluido: isDone } : it)),
    }));
  }

  function updateItemText(id: string, texto: string, responsavel?: string) {
    setCl((c) => ({
      ...c,
      itens: c.itens.map((it) =>
        it.id === id ? { ...it, texto, responsavel: responsavel ?? it.responsavel } : it,
      ),
    }));
  }

  function deleteItem(id: string) {
    setCl((c) => ({ ...c, itens: c.itens.filter((it) => it.id !== id) }));
  }

  function addItem(item: InternalChecklistItem) {
    setCl((c) => ({ ...c, itens: [...c.itens, item] }));
  }

  function deleteCl() {
    onDelete(cl.id);
    start(() => excluirChecklist(cl.id, cardId, setor));
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="group flex items-center gap-2 mb-2">
        <CheckSquareIcon size={12} className="shrink-0 text-text-3" />
        {editingTitle ? (
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
            className="flex-1 bg-transparent border-b border-primary/40 text-xs font-semibold text-text focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            onClick={() => { setTitulo(cl.titulo); setEditingTitle(true); }}
            className="flex-1 cursor-text text-xs font-semibold text-text-2 uppercase tracking-wider"
          >
            {cl.titulo}
          </span>
        )}
        <span className="text-[11px] text-text-3 shrink-0">{done}/{total}</span>
        <button
          type="button"
          onClick={deleteCl}
          className="hidden group-hover:flex shrink-0 text-text-3 hover:text-danger transition-colors"
        >
          <TrashIcon size={11} />
        </button>
      </div>

      {total > 0 && (
        <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {cl.itens.map((item) => (
          <CheckItemRow
            key={item.id}
            item={item}
            checklistId={cl.id}
            cardId={cardId}
            cardTitulo={cardTitulo}
            setor={setor}
            usuarios={usuarios}
            onToggle={toggleItem}
            onUpdate={updateItemText}
            onDelete={deleteItem}
          />
        ))}
      </div>

      <AddItemForm
        checklistId={cl.id}
        cardId={cardId}
        cardTitulo={cardTitulo}
        setor={setor}
        usuarios={usuarios}
        onAdd={addItem}
      />
    </div>
  );
}

// ── Tab ────────────────────────────────────────────────────────────────

export function CardChecklistTab({
  checklists: initial,
  cardId,
  cardTitulo,
  setor,
}: {
  checklists: InternalChecklist[];
  cardId: string;
  cardTitulo: string;
  setor: Setor;
}) {
  const [checklists, setChecklists] = useState(initial);
  const [newName, setNewName] = useState("");
  const [addingCl, setAddingCl] = useState(false);
  const [usuarios, setUsuarios] = useState<SquadUsuario[]>([]);
  const [, start] = useTransition();

  useEffect(() => {
    buscarUsuariosSquadSystem().then(setUsuarios).catch(() => {});
  }, []);

  function createCl() {
    const n = newName.trim();
    if (!n) return;
    setNewName("");
    setAddingCl(false);
    start(async () => {
      const cl = await criarChecklist(cardId, n, setor);
      setChecklists((prev) => [...prev, cl]);
    });
  }

  function deleteCl(id: string) {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {checklists.map((cl) => (
        <ChecklistBlock
          key={cl.id}
          checklist={cl}
          cardId={cardId}
          cardTitulo={cardTitulo}
          setor={setor}
          usuarios={usuarios}
          onDelete={deleteCl}
        />
      ))}

      {addingCl ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createCl(); if (e.key === "Escape") setAddingCl(false); }}
            placeholder="Nome do checklist..."
            className="flex-1 bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
            autoFocus
          />
          <button
            type="button"
            onClick={createCl}
            disabled={!newName.trim()}
            className="rounded px-3 py-1.5 text-[11px] font-medium bg-primary text-white disabled:opacity-50"
          >
            Criar
          </button>
          <button
            type="button"
            onClick={() => setAddingCl(false)}
            className="rounded px-2.5 py-1.5 text-[11px] text-text-3 hover:text-text"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingCl(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-text-3 hover:border-primary/40 hover:text-text transition-colors"
        >
          <PlusIcon size={12} />
          Nova lista de verificação
        </button>
      )}
    </div>
  );
}
