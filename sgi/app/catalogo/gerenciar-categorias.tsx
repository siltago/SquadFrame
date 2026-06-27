"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/components/user-provider";
import { criarCategoria, editarCategoria, apagarCategoria } from "@/app/catalogo/actions";

type Categoria = { id: string; nome: string; tipo: string };
type Linha = { id: string; nome: string; categorias: Categoria[] };

const TIPOS_CAT = ["OUTROS", "ESTRUTURAL", "DECORATIVO", "VEDACAO", "ACESSORIO"];

function CategoriaRow({
  cat,
  linhaId,
  podeGerenciar,
}: {
  cat: Categoria;
  linhaId: string;
  podeGerenciar: boolean;
}) {
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
        await editarCategoria(cat.id, linhaId, fd);
        setEditando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  function handleApagar() {
    setErro(null);
    start(async () => {
      try {
        await apagarCategoria(cat.id, linhaId);
        router.refresh();
      } catch (err: any) { setErro(err.message); setConfirmando(false); }
    });
  }

  if (editando) {
    return (
      <div className="px-3 py-3 bg-canvas border-b border-line last:border-0">
        <form onSubmit={handleEditar} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label text-[10px]">Nome *</label>
            <input name="nome" defaultValue={cat.nome} required
              className="field h-7 text-xs w-40" />
          </div>
          <div>
            <label className="label text-[10px]">Tipo</label>
            <select name="tipo" defaultValue={cat.tipo} className="field h-7 text-xs">
              {TIPOS_CAT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {erro && <p className="w-full text-xs text-red-500">{erro}</p>}
          <button type="submit" disabled={pending}
            className="btn-primary text-xs px-2.5 py-1">
            {pending ? "…" : "Salvar"}
          </button>
          <button type="button" onClick={() => { setEditando(false); setErro(null); }}
            className="btn-ghost text-xs px-2.5 py-1">Cancelar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-ink">{cat.nome}</span>
        {cat.tipo && cat.tipo !== "OUTROS" && (
          <span className="ml-2 rounded-full bg-steel/10 px-2 py-0.5 text-[10px] font-medium text-steel">
            {cat.tipo}
          </span>
        )}
      </div>
      {podeGerenciar && (
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setEditando(true)} title="Editar"
            className="rounded p-1 text-ink-faint hover:bg-surface hover:text-ink">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} title="Excluir"
              className="rounded p-1 text-ink-faint hover:bg-red-50 hover:text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {erro && <span className="text-xs text-red-500">{erro}</span>}
              <button onClick={handleApagar} disabled={pending}
                className="rounded border border-red-300 bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {pending ? "…" : "Excluir"}
              </button>
              <button onClick={() => { setConfirmando(false); setErro(null); }}
                className="text-[10px] text-ink-faint hover:text-ink">Não</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaSection({
  linha,
  podeGerenciar,
}: {
  linha: Linha;
  podeGerenciar: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await criarCategoria(linha.id, fd);
        setCriando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-canvas border-b border-line">
        <span className="text-xs font-semibold text-ink">{linha.nome}</span>
        {podeGerenciar && (
          <button onClick={() => { setCriando(!criando); setErro(null); }}
            className="text-xs text-steel hover:underline">
            {criando ? "Cancelar" : "+ Categoria"}
          </button>
        )}
      </div>

      {criando && (
        <div className="px-3 py-3 bg-steel/5 border-b border-line">
          <form onSubmit={handleCriar} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label text-[10px]">Nome *</label>
              <input name="nome" required autoFocus
                className="field h-7 text-xs w-44" placeholder="Ex: ESTRUTURAL" />
            </div>
            <div>
              <label className="label text-[10px]">Tipo</label>
              <select name="tipo" className="field h-7 text-xs">
                {TIPOS_CAT.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {erro && <p className="w-full text-xs text-red-500">{erro}</p>}
            <button type="submit" disabled={pending}
              className="btn-primary text-xs px-2.5 py-1">
              {pending ? "…" : "Criar"}
            </button>
          </form>
        </div>
      )}

      {linha.categorias.length === 0 ? (
        <p className="px-4 py-3 text-xs text-ink-faint">Nenhuma categoria.</p>
      ) : (
        linha.categorias.map((cat) => (
          <CategoriaRow key={cat.id} cat={cat} linhaId={linha.id} podeGerenciar={podeGerenciar} />
        ))
      )}
    </div>
  );
}

export function GerenciarCategorias({
  linhas,
  podeCriar,
}: {
  linhas: Linha[];
  podeCriar: boolean;
}) {
  const podeGerenciar = usePode("catalogo.categoria.gerenciar", "catalogo.criar") || podeCriar;

  if (linhas.length === 0) {
    return (
      <div className="mt-4 card p-8 text-center text-sm text-ink-faint">
        Nenhuma linha cadastrada. Crie linhas antes de adicionar categorias.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {linhas.map((l) => (
        <LinhaSection key={l.id} linha={l} podeGerenciar={podeGerenciar} />
      ))}
    </div>
  );
}
