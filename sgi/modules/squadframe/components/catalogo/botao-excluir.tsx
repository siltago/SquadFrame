"use client";

import { useState, useTransition } from "react";
import { deletarProduto } from "@/modules/squadframe/actions/catalogo/actions";

export function BotaoExcluir({ linhaId, produtoId }: { linhaId: string; produtoId: string }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Excluir este produto? Esta ação não pode ser desfeita.")) return;
    setErro(null);
    startTransition(async () => {
      try {
        await deletarProduto(linhaId, produtoId);
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        {pending ? "Excluindo…" : "Excluir produto"}
      </button>
      {erro && <p className="text-xs text-red-500 max-w-xs">{erro}</p>}
    </div>
  );
}
