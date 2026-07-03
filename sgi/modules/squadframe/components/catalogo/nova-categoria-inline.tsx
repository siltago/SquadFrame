"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarCategoria } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";

const TIPOS = [
  "PERFIS",
  "COMPONENTES",
  "VIDROS",
  "FERRAGENS",
  "BORRACHAS",
  "ACESSÓRIOS",
  "SELANTES",
  "OUTROS",
] as const;

export function NovaCategoriaInline({ linhaId }: { linhaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      try {
        await criarCategoria(linhaId, fd);
        setAberto(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary"
      >
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nova categoria
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label text-xs">Tipo</label>
        <select name="tipo" className="field" disabled={pending}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label text-xs">Nome</label>
        <input
          name="nome"
          required
          autoFocus
          placeholder="Ex: BATENTES"
          className="field max-w-xs"
          style={{ textTransform: "uppercase" }}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Criar"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setAberto(false);
          setErro(null);
        }}
        disabled={pending}
      >
        Cancelar
      </Button>
      {erro && <p className="w-full text-xs text-danger">{erro}</p>}
    </form>
  );
}
