"use client";

import { useState, useTransition } from "react";
import { adicionarTipologiaAction } from "@/modules/wise/works/actions";

export function AdicionarTipologiaForm({
  loteId,
  obraId,
  onFechar,
}: {
  loteId: string;
  obraId: string;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    const fd = new FormData();
    fd.append("nome", nome);
    fd.append("quantidade", quantidade);
    startTransition(async () => {
      const resultado = await adicionarTipologiaAction(loteId, obraId, fd);
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onFechar();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Nome da tipologia"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
        <input
          type="number"
          min="1"
          className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Qtd"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !nome.trim()}
          onClick={submeter}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Adicionar"}
        </button>
        <button type="button" onClick={onFechar} className="text-xs text-text-3 hover:text-text-2">
          Cancelar
        </button>
        {erro && <span className="text-xs text-red-500">{erro}</span>}
      </div>
    </div>
  );
}
