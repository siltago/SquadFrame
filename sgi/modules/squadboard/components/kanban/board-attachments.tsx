"use client";

import { useState, useTransition, useRef } from "react";
import { cn } from "@/ui/lib/cn";
import { AttachmentIcon, LinkIcon, TrashIcon, ExternalLinkIcon, UploadIcon } from "@/ui/icons";
import { criarAnexo, deletarAnexo, uploadAnexoArquivo } from "@/modules/squadboard/actions/board-content";
import type { EntityType, BoardAnexo } from "@/modules/squadboard/types/board-content";

function FileIcon({ ext }: { ext: string }) {
  const color =
    ext === "pdf" ? "text-red-500" :
    ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) ? "text-blue-500" :
    "text-text-3";
  return (
    <span className={cn("shrink-0 text-[10px] font-bold uppercase", color)}>{ext || "?"}</span>
  );
}

function getExt(nome: string) {
  return nome.split(".").pop()?.toLowerCase() ?? "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BoardAttachments({
  entityType,
  entityId,
  anexos,
  onUpdate,
  showForm,
  onHideForm,
}: {
  entityType: EntityType;
  entityId: string;
  anexos: BoardAnexo[];
  onUpdate: (anexos: BoardAnexo[]) => void;
  showForm: boolean;
  onHideForm: () => void;
}) {
  const [tab, setTab] = useState<"link" | "arquivo">("arquivo");
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setNome(""); setUrl(""); setFile(null); setDragging(false);
    onHideForm();
  }

  function handleFile(f: File) {
    setFile(f);
    if (!nome) setNome(f.name);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function salvarArquivo() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const novo = await uploadAnexoArquivo(entityType, entityId, fd);
      onUpdate([...anexos, novo]);
      resetForm();
    } finally {
      setUploading(false);
    }
  }

  function salvarLink() {
    const n = nome.trim();
    const u = url.trim();
    if (!n || !u) return;
    resetForm();
    startTransition(async () => {
      const novo = await criarAnexo(entityType, entityId, n, u.startsWith("http") ? u : `https://${u}`);
      onUpdate([...anexos, novo]);
    });
  }

  function remover(id: string) {
    onUpdate(anexos.filter((a) => a.id !== id));
    startTransition(() => deletarAnexo(id));
  }

  if (anexos.length === 0 && !showForm) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <AttachmentIcon size={14} className="text-text-3" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3">Anexos</p>
      </div>

      {/* Lista */}
      {anexos.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {anexos.map((a) => {
            const ext = getExt(a.nome);
            return (
              <div
                key={a.id}
                className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-3">
                  <FileIcon ext={ext} />
                </div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm font-medium text-primary hover:underline"
                >
                  {a.nome}
                </a>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-text-3 hover:text-text transition-colors"
                  aria-label="Abrir"
                >
                  <ExternalLinkIcon size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => remover(a.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-text-3 hover:text-danger transition-all"
                  aria-label="Remover"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 flex flex-col gap-3">
          {/* Tabs */}
          <div className="flex gap-1 rounded-md bg-surface-3 p-0.5">
            {(["arquivo", "link"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded py-1 text-xs font-medium transition-colors",
                  tab === t
                    ? "bg-surface text-text shadow-sm"
                    : "text-text-3 hover:text-text-2",
                )}
              >
                {t === "arquivo" ? "Arquivo" : "Link"}
              </button>
            ))}
          </div>

          {tab === "arquivo" ? (
            <>
              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !file && inputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 transition-colors cursor-pointer",
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  file && "cursor-default",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.xls,.xlsx,.zip"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3">
                      <FileIcon ext={getExt(file.name)} />
                    </div>
                    <p className="max-w-[180px] truncate text-xs font-medium text-text-2">{file.name}</p>
                    <p className="text-[11px] text-text-3">{formatBytes(file.size)}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setNome(""); }}
                      className="mt-1 text-[11px] text-text-3 hover:text-danger transition-colors"
                    >
                      Trocar arquivo
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadIcon size={20} className="text-text-3" />
                    <p className="text-xs text-text-3">
                      Arraste ou <span className="text-primary font-medium">selecione</span>
                    </p>
                    <p className="text-[11px] text-text-3">PDF, PNG, JPG, DOCX…</p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={salvarArquivo}
                  disabled={!file || uploading}
                  className="flex-1 rounded-md bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {uploading ? "Enviando…" : "Enviar"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do link"
                className="field w-full text-sm"
                autoFocus
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL (https://…)"
                className="field w-full text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvarLink();
                  if (e.key === "Escape") resetForm();
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={salvarLink}
                  disabled={!nome.trim() || !url.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-text-3 hover:bg-surface-3 hover:text-text transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
