"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarFornecedor } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";

type FornecedorVinculado = {
  id: string;
  fornecedor: { id: string; nome: string } | null;
  codigo_fornecedor: string | null;
  preco_referencia: number | null;
};

type FornecedorDisponivel = { id: string; nome: string };

export function AbaFornecedores({
  produtoId,
  linhaId,
  fornecedoresVinculados,
  fornecedoresDisponiveis,
}: {
  produtoId: string;
  linhaId: string;
  fornecedoresVinculados: FornecedorVinculado[];
  fornecedoresDisponiveis: FornecedorDisponivel[];
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      try {
        await adicionarFornecedor(produtoId, linhaId, fd);
        setMostrarForm(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Tabela de fornecedores vinculados */}
      {fornecedoresVinculados.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-4 py-2.5 font-medium">Fornecedor</th>
                <th className="px-4 py-2.5 font-medium">Código</th>
                <th className="px-4 py-2.5 font-medium">Preço ref.</th>
              </tr>
            </thead>
            <tbody>
              {fornecedoresVinculados.map((fv) => (
                <tr
                  key={fv.id}
                  className="border-b border-border last:border-0 hover:bg-bg"
                >
                  <td className="px-4 py-2.5 font-medium">
                    {fv.fornecedor?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-2">
                    {fv.codigo_fornecedor ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-2">
                    {fv.preco_referencia != null
                      ? fv.preco_referencia.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fornecedoresVinculados.length === 0 && !mostrarForm && (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-3">
            Nenhum fornecedor vinculado a este produto.
          </p>
        </div>
      )}

      {/* Formulário inline */}
      {mostrarForm ? (
        <form onSubmit={handleSubmit} className="card max-w-md space-y-4 p-5">
          <p className="font-display text-sm font-semibold text-text">
            Adicionar fornecedor
          </p>

          <div>
            <label className="label">Fornecedor</label>
            <input
              name="fornecedor_nome"
              required
              list="fornecedores-list"
              className="field"
              placeholder="Digite ou selecione um fornecedor"
            />
            <datalist id="fornecedores-list">
              {fornecedoresDisponiveis.map((f) => (
                <option key={f.id} value={f.nome} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-text-3">
              Se o fornecedor não existir, será criado automaticamente.
            </p>
          </div>

          <div>
            <label className="label">
              Código do fornecedor{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <input
              name="codigo_fornecedor"
              className="field font-mono"
              placeholder="Ex: FRN-4521"
            />
          </div>

          <div>
            <label className="label">
              Preço de referência{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <input
              name="preco_referencia"
              type="number"
              step="0.0001"
              min="0"
              className="field"
              placeholder="0,00"
            />
          </div>

          {erro && <p className="text-xs text-danger">{erro}</p>}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={pending}
            >
              {pending ? "Salvando…" : "Adicionar"}
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
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
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
          Adicionar fornecedor
        </button>
      )}
    </div>
  );
}
