"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vincularCor, vincularTodasCores } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";

type CorRal = { id: string; codigo_ral: string; nome: string | null; hex: string | null };
type Acabamento = { id: string; nome: string };
type ProdutoCor = {
  cor: CorRal | null;
  acabamento: Acabamento | null;
};

export function AbaCores({
  produtoId,
  linhaId,
  cores,
  coresDisponiveis,
  acabamentos,
}: {
  produtoId: string;
  linhaId: string;
  cores: ProdutoCor[];
  coresDisponiveis: CorRal[];
  acabamentos: Acabamento[];
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const idsVinculados = new Set(cores.map((c) => c.cor?.id).filter(Boolean) as string[]);
  const naoVinculadas = coresDisponiveis.filter((c) => !idsVinculados.has(c.id));
  const todasVinculadas = naoVinculadas.length === 0 && coresDisponiveis.length > 0;

  function handleVincularTodas() {
    startTransition(async () => {
      try {
        await vincularTodasCores(produtoId, linhaId);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const corId = String(data.get("cor_id") || "");
    const acabamentoId = String(data.get("acabamento_id") || "") || null;
    setErro(null);
    startTransition(async () => {
      try {
        await vincularCor(produtoId, linhaId, corId, acabamentoId);
        setMostrarForm(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Tabela de cores vinculadas */}
      {cores.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="w-10 px-4 py-2.5" />
                <th className="px-4 py-2.5 font-medium">Cor RAL</th>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Acabamento</th>
              </tr>
            </thead>
            <tbody>
              {cores.map((c) => (
                <tr
                  key={c.cor?.id}
                  className="border-b border-border last:border-0 hover:bg-bg"
                >
                  <td className="px-4 py-2">
                    <span
                      className="inline-block h-6 w-6 rounded border border-border"
                      style={{ backgroundColor: c.cor?.hex ?? "#e5e7eb" }}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">
                    {c.cor?.codigo_ral ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-2">
                    {c.cor?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-2">
                    {c.acabamento?.nome ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cores.length === 0 && !mostrarForm && (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-3">
            Nenhuma cor RAL vinculada a este produto.
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        {/* Vincular todas */}
        {!todasVinculadas && naoVinculadas.length > 0 && (
          <button
            onClick={handleVincularTodas}
            disabled={pending}
            className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {pending ? "Vinculando…" : `Vincular todas (${naoVinculadas.length})`}
          </button>
        )}

        {/* Vincular uma cor */}
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            disabled={pending}
            className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Vincular cor
          </button>
        )}
      </div>

      {/* Formulário vincular uma cor */}
      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card max-w-sm space-y-4 p-5">
          <p className="font-display text-sm font-semibold text-text">
            Vincular cor RAL
          </p>

          <div>
            <label className="label">Cor RAL</label>
            <select name="cor_id" required className="field">
              <option value="">Selecione a cor…</option>
              {naoVinculadas.filter((cor) => cor.id).map((cor) => (
                <option key={cor.id} value={cor.id}>
                  {cor.codigo_ral}
                  {cor.nome ? ` — ${cor.nome}` : ""}
                </option>
              ))}
            </select>
            {naoVinculadas.length === 0 && (
              <p className="mt-1 text-xs text-text-3">
                Todas as cores já estão vinculadas.
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Acabamento{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <select name="acabamento_id" className="field">
              <option value="">Sem acabamento</option>
              {acabamentos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>

          {erro && <p className="text-xs text-danger">{erro}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Vincular"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setMostrarForm(false); setErro(null); }}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
