"use client";

import { useState, useEffect, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { Button } from "@/ui/components/Button";
import { CloseIcon } from "@/ui/icons";
import {
  buscarEtiquetas,
  criarEtiqueta,
  atualizarEtiqueta,
  deletarEtiqueta,
} from "@/modules/squadboard/actions/etiquetas";
import { LABEL_CORES, type BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (cor: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LABEL_CORES.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className={cn(
            "h-6 w-6 rounded-full transition-all",
            value === cor ? "ring-2 ring-offset-2 ring-offset-surface ring-primary scale-110" : "hover:scale-110",
          )}
          style={{ backgroundColor: cor }}
          aria-label={cor}
        />
      ))}
    </div>
  );
}

function EtiquetaForm({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: BoardEtiqueta;
  onSalvar: (nome: string, cor: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [cor, setCor] = useState(inicial?.cor ?? LABEL_CORES[5]);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 flex flex-col gap-3">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da etiqueta"
        className="field w-full"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && nome.trim()) onSalvar(nome.trim(), cor);
          if (e.key === "Escape") onCancelar();
        }}
      />
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-3">Cor</p>
        <ColorPicker value={cor} onChange={setCor} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={() => nome.trim() && onSalvar(nome.trim(), cor)} disabled={!nome.trim()}>
          {inicial ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}

export function LabelsManager({
  open,
  onClose,
  onEtiquetasChange,
}: {
  open: boolean;
  onClose: () => void;
  onEtiquetasChange?: () => void;
}) {
  const [etiquetas, setEtiquetas] = useState<BoardEtiqueta[]>([]);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCriando(false);
    setEditandoId(null);
    buscarEtiquetas().then(setEtiquetas).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  function handleCriar(nome: string, cor: string) {
    startTransition(async () => {
      const nova = await criarEtiqueta(nome, cor);
      setEtiquetas((prev) => [...prev, nova]);
      setCriando(false);
      onEtiquetasChange?.();
    });
  }

  function handleAtualizar(id: string, nome: string, cor: string) {
    startTransition(async () => {
      await atualizarEtiqueta(id, { nome, cor });
      setEtiquetas((prev) => prev.map((e) => (e.id === id ? { ...e, nome, cor } : e)));
      setEditandoId(null);
      onEtiquetasChange?.();
    });
  }

  function handleDeletar(id: string) {
    startTransition(async () => {
      await deletarEtiqueta(id);
      setEtiquetas((prev) => prev.filter((e) => e.id !== id));
      onEtiquetasChange?.();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "sbFadeIn 120ms ease both" }}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ animation: "sbSlideUp 150ms cubic-bezier(.16,1,.3,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text">Etiquetas</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin px-5 py-4 flex flex-col gap-2">
          {etiquetas.length === 0 && !criando ? (
            <p className="py-4 text-center text-sm text-text-3">Nenhuma etiqueta ainda.</p>
          ) : (
            etiquetas.map((e) =>
              editandoId === e.id ? (
                <EtiquetaForm
                  key={e.id}
                  inicial={e}
                  onSalvar={(nome, cor) => handleAtualizar(e.id, nome, cor)}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2 group transition-colors"
                >
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
                  <span className="flex-1 text-sm text-text">{e.nome}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setCriando(false); setEditandoId(e.id); }}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
                      aria-label="Editar"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDeletar(e.id)}
                      disabled={isPending}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:bg-danger/10 hover:text-danger transition-colors"
                      aria-label="Excluir"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ),
            )
          )}

          {criando && (
            <EtiquetaForm
              onSalvar={handleCriar}
              onCancelar={() => setCriando(false)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => { setEditandoId(null); setCriando(true); }}
            disabled={criando}
          >
            + Nova etiqueta
          </Button>
        </div>
      </div>
    </div>
  );
}
