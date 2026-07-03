"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Select } from "@/ui/components/Select";
import { Chip } from "@/ui/components/Chip";

export type Filters = {
  tipo: string;
  q: string;
  fornecedor: string;
  linha: string;
  categoria: string;
  status: string;
  ordem: string;
};

type Props = {
  fornecedores: string[];
  linhas: { id: string; nome: string }[];
  categorias: string[];
  current: Filters;
};

const SearchIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export function FilterBar({ fornecedores, linhas, categorias, current }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const buildUrl = (overrides: Partial<Record<keyof Filters, string | null>>) => {
    const next: Record<string, string> = {};
    const base: Filters = { ...current };

    for (const [k, v] of Object.entries(overrides)) {
      (base as any)[k] = v ?? "";
    }

    if (base.tipo) next.tipo = base.tipo;
    if (base.q) next.q = base.q;
    if (base.fornecedor) next.fornecedor = base.fornecedor;
    if (base.linha) next.linha = base.linha;
    if (base.categoria) next.categoria = base.categoria;
    if (base.status) next.status = base.status;
    if (base.ordem) next.ordem = base.ordem;

    return `/squadframe/catalogo?${new URLSearchParams(next).toString()}`;
  };

  const go = (overrides: Partial<Record<keyof Filters, string | null>>) => {
    startTransition(() => router.push(buildUrl(overrides)));
  };

  const handleFornecedor = (v: string) =>
    go({ fornecedor: v || null, linha: null, categoria: null, q: null });
  const handleLinha = (v: string) =>
    go({ linha: v || null, categoria: null, q: null });
  const handleCategoria = (v: string) => go({ categoria: v || null, q: null });
  const handleStatus = (v: string) => go({ status: v || null });
  const handleOrdem = (v: string) => go({ ordem: v || null });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchRef.current?.value.trim() || null;
    go({ q });
  };

  const clearAll = () =>
    go({ q: null, fornecedor: null, linha: null, categoria: null, status: null });

  const hasFilters =
    current.q || current.fornecedor || current.linha || current.categoria || current.status;

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 transition-opacity ${
        isPending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          ref={searchRef}
          type="search"
          defaultValue={current.q}
          placeholder="Buscar por código, nome ou alias…"
          prefixIcon={SearchIcon}
          className="h-10"
        />
        <Button type="submit" className="shrink-0 h-10">Buscar</Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={clearAll} className="shrink-0 h-10">
            Limpar
          </Button>
        )}
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {fornecedores.length > 0 && (
          <Select
            value={current.fornecedor}
            onChange={(e) => handleFornecedor(e.target.value)}
            fullWidth={false}
            placeholder="Todos os fornecedores"
            className="h-9 text-sm"
          >
            {fornecedores.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        )}

        {linhas.length > 0 && (
          <Select
            value={current.linha}
            onChange={(e) => handleLinha(e.target.value)}
            fullWidth={false}
            placeholder="Todas as linhas"
            className="h-9 text-sm"
          >
            {linhas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        )}

        {categorias.length > 0 && (
          <Select
            value={current.categoria}
            onChange={(e) => handleCategoria(e.target.value)}
            fullWidth={false}
            placeholder="Todas as categorias"
            className="h-9 text-sm"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        )}

        <Select
          value={current.status}
          onChange={(e) => handleStatus(e.target.value)}
          fullWidth={false}
          className="h-9 text-sm"
        >
          <option value="">Somente ativos</option>
          <option value="todos">Todos</option>
          <option value="inativo">Somente inativos</option>
        </Select>

        <Select
          value={current.ordem}
          onChange={(e) => handleOrdem(e.target.value)}
          fullWidth={false}
          className="h-9 text-sm"
        >
          <option value="">Ordenar por nome</option>
          <option value="codigo">Ordenar por código</option>
          <option value="categoria">Ordenar por categoria</option>
        </Select>
      </div>

      {hasFilters && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {current.q && (
            <Chip variant="primary" onRemove={() => go({ q: null })}>
              {`"${current.q}"`}
            </Chip>
          )}
          {current.fornecedor && (
            <Chip
              variant="primary"
              onRemove={() => go({ fornecedor: null, linha: null, categoria: null })}
            >
              {current.fornecedor}
            </Chip>
          )}
          {current.linha && (
            <Chip
              variant="primary"
              onRemove={() => go({ linha: null, categoria: null })}
            >
              {linhas.find((l) => l.id === current.linha)?.nome ?? current.linha}
            </Chip>
          )}
          {current.categoria && (
            <Chip variant="primary" onRemove={() => go({ categoria: null })}>
              {current.categoria}
            </Chip>
          )}
          {current.status === "inativo" && (
            <Chip variant="primary" onRemove={() => go({ status: null })}>
              Somente inativos
            </Chip>
          )}
          {current.status === "todos" && (
            <Chip variant="primary" onRemove={() => go({ status: null })}>
              Incluindo inativos
            </Chip>
          )}
        </div>
      )}
    </div>
  );
}
