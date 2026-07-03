"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarAba } from "@/modules/squadframe/actions/catalogo/actions";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { TIPO_UNIDADE_OPCOES } from "@/modules/squadframe/lib/tipo-unidade";

export function NovaAbaInline({ collapsed }: { collapsed?: boolean } = {}) {
  const pode = usePode("catalogo.criar");
  if (!pode) return null;
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      try {
        await criarAba(fd);
        setAberta(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  if (!aberta) {
    return (
      <button
        onClick={() => setAberta(true)}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-text-3 transition-colors hover:bg-bg hover:text-text-2 ${collapsed ? "justify-center w-full" : ""}`}
        title="Nova aba"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {!collapsed && "Nova aba"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-primary/30 bg-bg p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-text-2">Nome da aba</label>
        <input
          name="nome"
          autoFocus
          required
          placeholder="Ex: Perfil, Vidro…"
          disabled={pending}
          className="h-8 w-44 rounded border border-primary px-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-2">Unidade padrão</label>
        <select
          name="unidade"
          required
          defaultValue="UN"
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
        {pending ? "…" : "Criar"}
      </button>
      <button
        type="button"
        onClick={() => { setAberta(false); setErro(null); }}
        disabled={pending}
        className="h-8 rounded px-2 text-xs text-text-3 hover:text-text"
      >
        Cancelar
      </button>
      {erro && <span className="text-xs text-danger">{erro}</span>}
    </form>
  );
}
