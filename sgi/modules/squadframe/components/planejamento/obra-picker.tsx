"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { buscarObrasAction } from "@/modules/squadframe/actions/planejamento/actions";

type Obra = { id: string; nome: string; codigo: string | null; numero: number | null };

export function ObraPicker() {
  const [query, setQuery] = useState("");
  const [obras, setObras] = useState<Obra[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(async () => {
        setObras(await buscarObrasAction(query));
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="card p-6">
      <label className="label">Escolha a obra</label>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou código…"
        className="field mt-1 h-10 text-sm"
      />
      <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
        {pending && <p className="px-1 text-xs text-text-3">Buscando…</p>}
        {!pending && obras.length === 0 && (
          <p className="px-1 text-xs text-text-3">Nenhuma obra encontrada.</p>
        )}
        {obras.map((o) => (
          <Link
            key={o.id}
            href={`/squadframe/planejamento?aba=gerenciamento&obra=${o.id}`}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm hover:bg-bg transition-colors"
          >
            {o.codigo && <span className="font-mono text-xs text-text-3">{o.codigo}</span>}
            <span className="font-medium text-text">{o.nome}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
