"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/components/user-provider";
import { editarLinha, apagarLinha } from "@/app/catalogo/actions";

type Linha = {
  id: string;
  nome: string;
  fabricante: string | null;
  descricao: string | null;
  _count?: number;
};

function LinhaRow({ linha, podeCriar }: { linha: Linha; podeCriar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await editarLinha(linha.id, fd);
        setEditando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  function handleApagar() {
    setErro(null);
    start(async () => {
      try {
        await apagarLinha(linha.id);
      } catch (err: any) { setErro(err.message); setConfirmando(false); }
    });
  }

  if (editando) {
    return (
      <div className="px-4 py-4 bg-canvas border-b border-line last:border-0">
        <form onSubmit={handleEditar} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-[10px]">Nome *</label>
              <input name="nome" defaultValue={linha.nome} required className="field h-8 text-sm" />
            </div>
            <div>
              <label className="label text-[10px]">Fabricante / Fornecedor</label>
              <input name="fabricante" defaultValue={linha.fabricante ?? ""} className="field h-8 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-[10px]">Descrição</label>
              <input name="descricao" defaultValue={linha.descricao ?? ""} className="field h-8 text-sm" />
            </div>
          </div>
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-xs px-3 py-1.5">
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => { setEditando(false); setErro(null); }}
              className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink">{linha.nome}</p>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-faint">
          {linha.fabricante && <span>{linha.fabricante}</span>}
          {linha.descricao && <span>{linha.descricao}</span>}
          {linha._count !== undefined && (
            <span>{linha._count} produto{linha._count !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {podeCriar && (
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setEditando(true)} title="Editar"
            className="rounded p-1.5 text-ink-faint hover:bg-surface hover:text-ink">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} title="Excluir"
              className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {erro && <span className="text-xs text-red-500">{erro}</span>}
              <button onClick={handleApagar} disabled={pending}
                className="rounded border border-red-300 bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {pending ? "…" : "Confirmar"}
              </button>
              <button onClick={() => { setConfirmando(false); setErro(null); }}
                className="text-xs text-ink-faint hover:text-ink">Não</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GerenciarLinhas({
  linhas,
  tipoSlug,
  podeCriar,
}: {
  linhas: Linha[];
  tipoSlug: string;
  podeCriar: boolean;
}) {
  const podeGerenciar = usePode("catalogo.linha.gerenciar", "catalogo.criar") || podeCriar;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        {podeGerenciar && (
          <a
            href={`/catalogo/nova-linha?tipo=${tipoSlug}`}
            className="btn-primary text-sm"
          >
            + Nova linha
          </a>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Nenhuma linha cadastrada para este tipo.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line bg-canvas">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
              Linhas cadastradas ({linhas.length})
            </span>
          </div>
          {linhas.map((l) => (
            <LinhaRow key={l.id} linha={l} podeCriar={podeGerenciar} />
          ))}
        </div>
      )}
    </div>
  );
}
