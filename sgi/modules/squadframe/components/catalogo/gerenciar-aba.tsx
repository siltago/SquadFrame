"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarAba, apagarAba } from "@/modules/squadframe/actions/catalogo/actions";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { TIPO_UNIDADE_OPCOES } from "@/modules/squadframe/lib/tipo-unidade";

type Aba = { id: string; nome: string; slug: string; unidade?: string | null };

export function GerenciarAba({ aba }: { aba: Aba }) {
  const podeEditar  = usePode("catalogo.criar");
  const podeApagar  = usePode("catalogo.excluir");
  const [modo, setModo] = useState<"idle" | "editar" | "apagar">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!podeEditar && !podeApagar) return null;

  function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    start(async () => {
      try {
        await editarAba(aba.id, fd);
        setModo("idle");
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  function handleApagar() {
    setErro(null);
    start(async () => {
      try {
        await apagarAba(aba.id);
        router.push("/squadframe/catalogo");
      } catch (err: any) {
        setErro(err.message);
        setModo("idle");
      }
    });
  }

  if (modo === "editar") {
    return (
      <form
        onSubmit={handleEditar}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-primary/30 bg-bg p-3"
      >
        <div>
          <label className="mb-1 block text-xs text-text-2">Nome</label>
          <input
            name="nome"
            autoFocus
            required
            defaultValue={aba.nome}
            disabled={pending}
            className="h-8 w-44 rounded border border-primary px-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-2">Unidade padrão</label>
          <select
            name="unidade"
            required
            defaultValue={aba.unidade ?? "UN"}
            disabled={pending}
            className="h-8 rounded border border-primary px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            {TIPO_UNIDADE_OPCOES.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-8 rounded bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => { setModo("idle"); setErro(null); }}
          disabled={pending}
          className="h-8 rounded px-2 text-xs text-text-3 hover:text-text"
        >
          Cancelar
        </button>
        {erro && <span className="w-full text-xs text-danger">{erro}</span>}
      </form>
    );
  }

  if (modo === "apagar") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-danger-soft px-4 py-3">
        <p className="text-sm font-medium text-danger">
          Apagar a aba <strong>{aba.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        {erro && <p className="w-full text-xs text-danger">{erro}</p>}
        <button
          onClick={handleApagar}
          disabled={pending}
          className="rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Apagando…" : "Confirmar exclusão"}
        </button>
        <button
          onClick={() => { setModo("idle"); setErro(null); }}
          disabled={pending}
          className="text-sm text-text-3 hover:text-text underline"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 pl-2">
      {podeEditar && (
        <button
          onClick={() => setModo("editar")}
          title="Editar aba"
          className="rounded p-1.5 text-text-3 hover:bg-bg hover:text-text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      )}
      {podeApagar && (
        <button
          onClick={() => setModo("apagar")}
          title="Apagar aba"
          className="rounded p-1.5 text-text-3 hover:bg-danger-soft hover:text-danger"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>
  );
}
