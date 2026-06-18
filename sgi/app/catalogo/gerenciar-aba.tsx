"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarAba, apagarAba } from "@/app/catalogo/actions";
import { usePode } from "@/components/user-provider";
import { TIPO_UNIDADE_OPCOES } from "@/lib/tipo-unidade";

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
        router.push("/catalogo");
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
        className="flex flex-wrap items-end gap-2 rounded-lg border border-steel/30 bg-canvas p-3"
      >
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Nome</label>
          <input
            name="nome"
            autoFocus
            required
            defaultValue={aba.nome}
            disabled={pending}
            className="h-8 w-44 rounded border border-steel px-2.5 text-sm outline-none focus:ring-1 focus:ring-steel"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Unidade padrão</label>
          <select
            name="unidade"
            required
            defaultValue={aba.unidade ?? "UN"}
            disabled={pending}
            className="h-8 rounded border border-steel px-2 text-sm outline-none focus:ring-1 focus:ring-steel"
          >
            {TIPO_UNIDADE_OPCOES.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-8 rounded bg-steel px-3 text-xs font-medium text-white hover:bg-steel/90 disabled:opacity-50"
        >
          {pending ? "…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => { setModo("idle"); setErro(null); }}
          disabled={pending}
          className="h-8 rounded px-2 text-xs text-ink-faint hover:text-ink"
        >
          Cancelar
        </button>
        {erro && <span className="w-full text-xs text-red-500">{erro}</span>}
      </form>
    );
  }

  if (modo === "apagar") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm font-medium text-red-700">
          Apagar a aba <strong>{aba.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
        <button
          onClick={handleApagar}
          disabled={pending}
          className="rounded-card border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Apagando…" : "Confirmar exclusão"}
        </button>
        <button
          onClick={() => { setModo("idle"); setErro(null); }}
          disabled={pending}
          className="text-sm text-ink-faint hover:text-ink underline"
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
          className="rounded p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
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
          className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
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
