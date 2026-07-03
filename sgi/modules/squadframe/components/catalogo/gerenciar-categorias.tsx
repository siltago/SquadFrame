"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { criarCategoria, editarCategoria, apagarCategoria } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";
import { Badge } from "@/ui/components/Badge";
import { Alert } from "@/ui/components/Alert";
import { EmptyState } from "@/ui/components/EmptyState";

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
      <div className="border-b border-divider bg-bg px-3 py-3 last:border-0">
        <form onSubmit={handleEditar} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="label text-[10px]">Nome *</label>
            <input name="nome" defaultValue={cat.nome} required className="field h-7 text-xs w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label text-[10px]">Tipo</label>
            <select name="tipo" defaultValue={cat.tipo} className="field h-7 text-xs">
              {TIPOS_CAT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {erro && <Alert variant="danger" className="w-full py-1.5 text-xs">{erro}</Alert>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" size="sm"
            onClick={() => { setEditando(false); setErro(null); }}>
            Cancelar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-divider px-3 py-2 last:border-0">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium text-text">{cat.nome}</span>
        {cat.tipo && cat.tipo !== "OUTROS" && (
          <Badge variant="primary" size="sm">{cat.tipo}</Badge>
        )}
      </div>
      {podeGerenciar && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditando(true)}
            title="Editar"
            className="rounded p-1 text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              title="Excluir"
              className="rounded p-1 text-text-3 hover:bg-danger-soft hover:text-danger transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {erro && <span className="text-[10px] text-danger">{erro}</span>}
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={handleApagar}
                className="px-2 py-0.5 text-[10px]"
              >
                {pending ? "…" : "Excluir"}
              </Button>
              <button
                onClick={() => { setConfirmando(false); setErro(null); }}
                className="text-[10px] text-text-3 hover:text-text"
              >
                Não
              </button>
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
      <div className="flex items-center justify-between border-b border-divider bg-bg px-4 py-2.5">
        <span className="text-xs font-semibold text-text">{linha.nome}</span>
        {podeGerenciar && (
          <button
            onClick={() => { setCriando(!criando); setErro(null); }}
            className="text-xs text-primary hover:underline font-medium"
          >
            {criando ? "Cancelar" : "+ Categoria"}
          </button>
        )}
      </div>

      {criando && (
        <div className="border-b border-divider bg-primary-soft/30 px-3 py-3">
          <form onSubmit={handleCriar} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="label text-[10px]">Nome *</label>
              <input name="nome" required autoFocus
                className="field h-7 text-xs w-44" placeholder="Ex: ESTRUTURAL" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label text-[10px]">Tipo</label>
              <select name="tipo" className="field h-7 text-xs">
                {TIPOS_CAT.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {erro && <Alert variant="danger" className="w-full py-1.5 text-xs">{erro}</Alert>}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "…" : "Criar"}
            </Button>
          </form>
        </div>
      )}

      {linha.categorias.length === 0 ? (
        <p className="px-4 py-3 text-xs text-text-3">Nenhuma categoria.</p>
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
      <div className="mt-4 card p-8">
        <EmptyState title="Nenhuma linha cadastrada. Crie linhas antes de adicionar categorias." />
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
