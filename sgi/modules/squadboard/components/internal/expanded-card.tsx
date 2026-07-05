"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useUsuario } from "@/modules/squadframe/components/user-provider";
import { cn } from "@/ui/lib/cn";
import {
  CloseIcon, CalendarIcon, CheckSquareIcon, AttachmentIcon,
  ExternalLinkIcon, SendIcon, UserIcon, UsersIcon, TagIcon,
  ActivityIcon, LinkIcon, ClockIcon, PlusIcon, TrashIcon,
} from "@/ui/icons";
import {
  buscarCardInterno,
  editarCardInterno,
  criarComentario,
  adicionarResponsavelCard,
  removerResponsavelCard,
  adicionarLabelCard,
  removerLabelCard,
  buscarLabelsBoard,
  buscarListasDoBoard,
  buscarAtividades,
} from "@/modules/squadboard/actions/internal-board";
import {
  buscarUsuariosSquadSystem,
} from "@/modules/squadboard/actions/squadsystem";
import { CardChecklistTab } from "./card-checklist-tab";
import { CardRelationshipsTab } from "./card-relationships-tab";
import type {
  InternalBoardCard, InternalBoardCardDetail,
  InternalBoardMember, InternalCardLabel,
  InternalComment, InternalActivity, Setor,
} from "@/modules/squadboard/types/internal-board";
import type { ProviderAvailableColumn } from "@/modules/squadboard/providers/index";

// ── Tabs ──────────────────────────────────────────────────────────────

type Tab = "resumo" | "checklist" | "comentarios" | "relacionamentos" | "atividade";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "checklist", label: "Checklist" },
  { id: "comentarios", label: "Comentários" },
  { id: "relacionamentos", label: "Relacionamentos" },
  { id: "atividade", label: "Atividade" },
];

// ── Resumo: Inline title / desc ───────────────────────────────────────

function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function save() {
    setEditing(false);
    const t = text.trim();
    if (t && t !== value) onSave(t);
    else setText(value);
  }

  if (editing) {
    return (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { setEditing(false); setText(value); } }}
        className="w-full resize-none bg-surface-2 border border-primary/40 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-text focus:outline-none"
        rows={2}
        autoFocus
      />
    );
  }

  return (
    <h3
      onClick={() => { setText(value); setEditing(true); }}
      className="cursor-text text-sm font-semibold leading-snug text-text hover:text-primary transition-colors"
    >
      {value}
    </h3>
  );
}

function EditableDescription({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function save() {
    setEditing(false);
    if (text !== value) onSave(text);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setText(value); } }}
          className="w-full resize-none rounded-lg bg-surface-2 border border-primary/40 px-3 py-2.5 text-xs text-text leading-relaxed focus:outline-none"
          rows={4}
          autoFocus
          placeholder="Adicionar descrição..."
        />
        <div className="flex gap-1.5">
          <button type="button" onClick={save} className="rounded px-2.5 py-1 text-[11px] font-medium bg-primary text-white">Salvar</button>
          <button type="button" onClick={() => { setEditing(false); setText(value); }} className="rounded px-2.5 py-1 text-[11px] text-text-3 hover:text-text">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setText(value); setEditing(true); }}
      className={cn(
        "cursor-text rounded-lg bg-surface-2 px-3 py-2.5 text-xs leading-relaxed min-h-[40px]",
        value ? "text-text-2 whitespace-pre-wrap" : "text-text-3 italic",
      )}
    >
      {value || "Clique para adicionar descrição..."}
    </div>
  );
}

// ── Resumo: Member picker ──────────────────────────────────────────────

function MemberPicker({
  current,
  cardId,
  setor,
  cardTitulo,
  usuario,
  onAdd,
  onRemove,
}: {
  current: InternalBoardCard["responsaveis"];
  cardId: string;
  setor: Setor;
  cardTitulo: string;
  usuario: { id: string; nome?: string | null } | null;
  onAdd: (m: InternalBoardMember) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<InternalBoardMember[] | null>(null);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || allMembers) return;
    buscarUsuariosSquadSystem().then(setAllMembers);
  }, [open, allMembers]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle(m: InternalBoardMember) {
    const isMember = current.some((c) => c.id === m.id);
    if (isMember) {
      onRemove(m.id);
      start(() => removerResponsavelCard(cardId, m.id));
    } else {
      onAdd(m);
      start(() => adicionarResponsavelCard(cardId, setor, m.id, { cardTitulo, autorNome: usuario?.nome ?? undefined }));
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {current.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 group">
            {m.avatar ? (
              <img src={`${m.avatar}/30.png`} className="h-5 w-5 rounded-full object-cover" alt={m.nome} />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                {m.nome.charAt(0)}
              </span>
            )}
            <span className="text-xs text-text-2">{m.nome}</span>
            <button
              type="button"
              onClick={() => { onRemove(m.id); start(() => removerResponsavelCard(cardId, m.id)); }}
              className="hidden group-hover:flex text-text-3 hover:text-danger transition-colors"
            >
              <CloseIcon size={9} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border text-text-3 hover:border-primary/50 hover:text-primary transition-colors"
        >
          <PlusIcon size={10} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-surface shadow-xl py-1 max-h-48 overflow-y-auto">
          {allMembers === null ? (
            <p className="px-3 py-2 text-xs text-text-3">Carregando…</p>
          ) : allMembers.map((m) => {
            const active = current.some((c) => c.id === m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2 transition-colors"
              >
                {m.avatar ? (
                  <img src={`${m.avatar}/30.png`} className="h-5 w-5 rounded-full object-cover shrink-0" alt={m.nome} />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                    {m.nome.charAt(0)}
                  </span>
                )}
                <span className="flex-1 truncate text-xs text-text">{m.nome}</span>
                {active && <span className="text-primary text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Resumo: Label picker ───────────────────────────────────────────────

function LabelPicker({
  current,
  cardId,
  setor,
  onAdd,
  onRemove,
}: {
  current: InternalCardLabel[];
  cardId: string;
  setor: Setor;
  onAdd: (l: InternalCardLabel) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<InternalCardLabel[] | null>(null);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || allLabels) return;
    buscarLabelsBoard(setor).then(setAllLabels);
  }, [open, allLabels, setor]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle(l: InternalCardLabel) {
    const active = current.some((c) => c.id === l.id);
    if (active) {
      onRemove(l.id);
      start(() => removerLabelCard(cardId, l.id, setor));
    } else {
      onAdd(l);
      start(() => adicionarLabelCard(cardId, l.id, setor));
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-1">
        {current.map((l) => (
          <span
            key={l.id}
            onClick={() => { onRemove(l.id); start(() => removerLabelCard(cardId, l.id, setor)); }}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-75 transition-opacity"
            style={{ backgroundColor: l.cor }}
            title="Remover"
          >
            {l.nome}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-text-3 hover:border-primary/50 hover:text-primary transition-colors"
        >
          <PlusIcon size={9} />
          Etiqueta
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-surface shadow-xl py-1 max-h-48 overflow-y-auto">
          {allLabels === null ? (
            <p className="px-3 py-2 text-xs text-text-3">Carregando…</p>
          ) : allLabels.map((l) => {
            const active = current.some((c) => c.id === l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l)}
                className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-surface-2 transition-colors"
              >
                <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: l.cor }} />
                <span className="flex-1 truncate text-xs text-text">{l.nome || "(sem nome)"}</span>
                {active && <span className="text-primary text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Resumo: List picker ────────────────────────────────────────────────

function ListPicker({
  currentListaId,
  currentListaNome,
  cardId,
  cardTitulo,
  setor,
  onMove,
}: {
  currentListaId: string;
  currentListaNome: string;
  cardId: string;
  cardTitulo: string;
  setor: Setor;
  onMove: (novaListaId: string, novaListaNome: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [listas, setListas] = useState<ProviderAvailableColumn[] | null>(null);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || listas) return;
    buscarListasDoBoard(setor).then(setListas);
  }, [open, listas, setor]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-2 hover:border-primary/40 transition-colors"
      >
        <span className="truncate max-w-[140px]">{currentListaNome}</span>
        <span className="text-text-3">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-surface shadow-xl py-1 max-h-48 overflow-y-auto">
          {listas === null ? (
            <p className="px-3 py-2 text-xs text-text-3">Carregando…</p>
          ) : listas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (l.id === currentListaId) return;
                onMove(l.id, l.nome);
                start(async () => {
                  const { moverCardInterno } = await import("@/modules/squadboard/actions/internal-board");
                  await moverCardInterno(cardId, l.id, setor, { cardTitulo, colunaNova: l.nome });
                });
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors",
                l.id === currentListaId ? "text-primary font-medium" : "text-text",
              )}
            >
              {l.id === currentListaId && <span>✓</span>}
              {l.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resumo tab ─────────────────────────────────────────────────────────

function ResumoTab({
  detalhe,
  setor,
  onUpdate,
}: {
  detalhe: InternalBoardCardDetail;
  setor: Setor;
  onUpdate: (patch: Partial<InternalBoardCardDetail>) => void;
}) {
  const [, start] = useTransition();
  const usuario = useUsuario();

  function saveDesc(desc: string) {
    onUpdate({ descricao: desc });
    start(() => editarCardInterno(detalhe.id, { descricao: desc }, setor));
  }

  function savePrazo(prazo: string) {
    onUpdate({ prazo: prazo || undefined });
    start(() => editarCardInterno(detalhe.id, { prazo: prazo || null }, setor));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inline metadata row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Membros */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">
            Responsáveis
          </p>
          <MemberPicker
            current={detalhe.responsaveis}
            cardId={detalhe.id}
            setor={setor}
            cardTitulo={detalhe.titulo}
            usuario={usuario}
            onAdd={(m) => onUpdate({ responsaveis: [...detalhe.responsaveis, m] })}
            onRemove={(id) => onUpdate({ responsaveis: detalhe.responsaveis.filter((r) => r.id !== id) })}
          />
        </div>

        {/* Prazo */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Prazo</p>
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={11} className="text-text-3 shrink-0" />
            <input
              type="date"
              defaultValue={detalhe.prazo ? detalhe.prazo.slice(0, 10) : ""}
              onChange={(e) => savePrazo(e.target.value)}
              className="bg-transparent text-xs text-text-2 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="col-span-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Lista</p>
          <ListPicker
            currentListaId={detalhe.colunaId}
            currentListaNome={detalhe.coluna}
            cardId={detalhe.id}
            cardTitulo={detalhe.titulo}
            setor={setor}
            onMove={(id, nome) => onUpdate({ colunaId: id, coluna: nome })}
          />
        </div>

        {/* Labels */}
        <div className="col-span-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Etiquetas</p>
          <LabelPicker
            current={detalhe.labels}
            cardId={detalhe.id}
            setor={setor}
            onAdd={(l) => onUpdate({ labels: [...detalhe.labels, l] })}
            onRemove={(id) => onUpdate({ labels: detalhe.labels.filter((l) => l.id !== id) })}
          />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Descrição</p>
        <EditableDescription value={detalhe.descricao} onSave={saveDesc} />
      </div>

      {/* Anexos */}
      {detalhe.anexos.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">Anexos</p>
          <div className="flex flex-col gap-1">
            {detalhe.anexos.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <AttachmentIcon size={11} className="shrink-0 text-text-3" />
                <span className="flex-1 truncate text-xs font-medium text-primary">{a.nome}</span>
                <ExternalLinkIcon size={10} className="shrink-0 text-text-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comentários tab ────────────────────────────────────────────────────

function ComentariosTab({
  comentarios: initial,
  cardId,
  cardTitulo,
  setor,
}: {
  comentarios: InternalComment[];
  cardId: string;
  cardTitulo: string;
  setor: Setor;
}) {
  const [comments, setComments] = useState(initial);
  const [texto, setTexto] = useState("");
  const [, start] = useTransition();
  const usuario = useUsuario();

  function send() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    start(async () => {
      const c = await criarComentario(cardId, t, setor, {
        cardTitulo,
        autorNome: usuario?.nome ?? undefined,
      });
      setComments((prev) => [c, ...prev]);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* New comment */}
      <div className="flex flex-col gap-1.5">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) send(); }}
          placeholder="Escreva um comentário… (Ctrl+Enter para enviar)"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
        />
        <button
          type="button"
          onClick={send}
          disabled={!texto.trim()}
          className="self-end flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-white disabled:opacity-50 transition-opacity"
        >
          <SendIcon size={11} />
          Enviar
        </button>
      </div>

      {/* List */}
      {comments.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-3">Nenhum comentário ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              {c.avatar ? (
                <img src={`${c.avatar}/30.png`} className="h-6 w-6 shrink-0 rounded-full object-cover" alt={c.autor} />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {c.autor.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text">{c.autor}</span>
                  <span className="text-[10px] text-text-3">
                    {new Date(c.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-2 whitespace-pre-wrap leading-relaxed">
                  {c.texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Atividade tab ──────────────────────────────────────────────────────

function AtividadeTab({
  cardId,
  setor,
}: {
  cardId: string;
  setor: Setor;
}) {
  const [activities, setActivities] = useState<InternalActivity[] | null>(null);

  useEffect(() => {
    buscarAtividades(cardId, setor).then(setActivities);
  }, [cardId, setor]);

  if (activities === null) {
    return <p className="py-4 text-center text-xs text-text-3 animate-pulse">Carregando atividade…</p>;
  }

  if (activities.length === 0) {
    return <p className="py-4 text-center text-xs text-text-3">Nenhuma atividade registrada.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 py-1.5">
          {a.avatar ? (
            <img src={`${a.avatar}/30.png`} className="h-5 w-5 shrink-0 rounded-full object-cover mt-0.5" alt={a.autor} />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold text-text-3 mt-0.5">
              {a.autor.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-2 leading-snug">{a.descricao}</p>
            <p className="mt-0.5 text-[10px] text-text-3">
              {new Date(a.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Expanded Card ─────────────────────────────────────────────────────

export function ExpandedCard({
  card: initialCard,
  setor,
  onClose,
}: {
  card: InternalBoardCard;
  setor: Setor;
  onClose: () => void;
}) {
  const [detalhe, setDetalhe] = useState<InternalBoardCardDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [titulo, setTitulo] = useState(initialCard.titulo);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTitulo(initialCard.titulo);
    setDetalhe(null);
    setActiveTab("resumo");
    buscarCardInterno(initialCard.id, setor).then(setDetalhe);
  }, [initialCard.id, setor]);

  function saveTitulo(t: string) {
    setTitulo(t);
    startTransition(() => editarCardInterno(initialCard.id, { titulo: t }, setor));
  }

  function patchDetalhe(patch: Partial<InternalBoardCardDetail>) {
    setDetalhe((prev) => prev ? { ...prev, ...patch } : prev);
  }

  const totalItems = (detalhe ?? initialCard).checklists.flatMap((c) => c.itens).length;
  const doneItems = (detalhe ?? initialCard).checklists.flatMap((c) => c.itens).filter((i) => i.concluido).length;

  return (
    <div className="rounded-xl border border-primary/30 bg-surface shadow-xl overflow-hidden w-full">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <EditableTitle value={titulo} onSave={saveTitulo} />
          <p className="mt-0.5 text-[10px] text-text-3">
            {initialCard.setor.charAt(0).toUpperCase() + initialCard.setor.slice(1)} · {detalhe?.coluna ?? initialCard.coluna}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {initialCard.shortUrl && (
            <a
              href={initialCard.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-primary transition-colors"
              title="Abrir no Trello"
            >
              <ExternalLinkIcon size={13} />
            </a>
          )}
          {totalItems > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5">
              <CheckSquareIcon size={11} className="text-text-3" />
              <span className="text-[11px] text-text-3 font-mono">{doneItems}/{totalItems}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
            title="Fechar"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 px-3 py-2 text-[11px] font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[80dvh] sm:max-h-[520px] overflow-y-auto scrollbar-thin px-4 py-3">
        {!detalhe && activeTab !== "atividade" ? (
          <p className="py-4 text-center text-xs text-text-3 animate-pulse">Carregando…</p>
        ) : activeTab === "resumo" && detalhe ? (
          <ResumoTab detalhe={detalhe} setor={setor} onUpdate={patchDetalhe} />
        ) : activeTab === "checklist" && detalhe ? (
          <CardChecklistTab
            checklists={detalhe.checklists}
            cardId={detalhe.id}
            cardTitulo={detalhe.titulo}
            setor={setor}
          />
        ) : activeTab === "comentarios" && detalhe ? (
          <ComentariosTab
            comentarios={detalhe.comentarios}
            cardId={detalhe.id}
            cardTitulo={detalhe.titulo}
            setor={setor}
          />
        ) : activeTab === "relacionamentos" && detalhe ? (
          <CardRelationshipsTab
            relacionamentos={detalhe.relacionamentos}
            cardId={detalhe.id}
            setor={setor}
          />
        ) : activeTab === "atividade" ? (
          <AtividadeTab cardId={initialCard.id} setor={setor} />
        ) : null}
      </div>
    </div>
  );
}
