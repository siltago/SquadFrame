"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enviarArquivo, deletarArquivo } from "@/app/catalogo/actions";

type Arquivo = {
  id: string;
  nome_original: string;
  url: string;
  url_preview: string | null;
  tipo: string;
  criado_em: string;
};

function BotaoExcluirArquivo({
  arquivoId,
  url,
  urlPreview,
  produtoId,
  linhaId,
}: {
  arquivoId: string;
  url: string;
  urlPreview: string | null;
  produtoId: string;
  linhaId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Excluir este arquivo? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await deletarArquivo(produtoId, linhaId, arquivoId, url, urlPreview);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title="Excluir arquivo"
      className="absolute right-2 top-2 z-10 rounded-md bg-white/90 p-1.5 text-red-400 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}

function IconeTipo({ tipo }: { tipo: string }) {
  if (tipo === "dxf") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-canvas">
        <span className="font-mono text-lg font-bold uppercase text-ink-faint">
          DXF
        </span>
      </div>
    );
  }
  if (tipo === "pdf") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-red-50">
        <span className="font-mono text-lg font-bold uppercase text-red-400">
          PDF
        </span>
      </div>
    );
  }
  return null;
}


export function AbaArquivos({
  produtoId,
  linhaId,
  arquivos,
}: {
  produtoId: string;
  linhaId: string;
  arquivos: Arquivo[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setNomeArquivo(file?.name ?? null);
    setErro(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("arquivo") as File;

    if (!file || file.size === 0) {
      setErro("Selecione um arquivo.");
      return;
    }

    setErro(null);
    setPending(true);
    try {
      await enviarArquivo(produtoId, linhaId, fd);
      setNomeArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? "Erro ao enviar arquivo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Upload */}
      <form onSubmit={handleSubmit} className="card p-5">
        <p className="mb-3 font-display text-sm font-semibold text-ink">
          Enviar arquivo
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-steel hover:text-steel">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {nomeArquivo ?? "Escolher arquivo"}
            <input
              ref={inputRef}
              type="file"
              name="arquivo"
              accept=".dxf,.png,.jpg,.jpeg,.webp,.pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !nomeArquivo}
            className="btn-primary"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
          <span className="text-xs text-ink-faint">
            DXF, PNG, JPG, WEBP, PDF
          </span>
        </div>
        {erro && <p className="mt-2 text-xs text-red-500">{erro}</p>}
      </form>

      {/* Lista de arquivos */}
      {arquivos.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-faint">Nenhum arquivo enviado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {arquivos.map((arq) => (
            <div
              key={arq.id}
              className="card group relative flex flex-col overflow-hidden transition-all hover:shadow-md"
            >
              <BotaoExcluirArquivo
                arquivoId={arq.id}
                url={arq.url}
                urlPreview={arq.url_preview}
                produtoId={produtoId}
                linhaId={linhaId}
              />
              <a
                href={arq.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-col"
              >
                {/* Preview */}
                <div className="flex h-52 items-center justify-center bg-white p-3">
                  {arq.url_preview ? (
                    <img
                      src={arq.url_preview}
                      alt={arq.nome_original}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <IconeTipo tipo={arq.tipo} />
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="truncate text-xs font-medium text-ink"
                    title={arq.nome_original}
                  >
                    {arq.nome_original}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {new Date(arq.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
