"use client";

import { useTransition } from "react";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { alterarFormaPagamento, excluirFormasPagamento } from "@/app/squadframe/compras/actions";
import { useBulkSelect } from "@/modules/squadframe/lib/use-bulk-select";
import { BulkDeleteToggle, BulkDeleteBar } from "@/modules/squadframe/components/bulk-delete-bar";

type FormasPagamento = { id: string; nome: string; descricao: string | null; ativo: boolean; is_faturamento_direto: boolean };

export function FormasPagamentoLista({ formas }: { formas: FormasPagamento[] }) {
  const podeExcluir = usePode("compras.formapagamento.gerenciar");
  const { modoExcluir, ativar, cancelar, selecionados, toggleItem, toggleTodos, confirmarExclusao, pending, erro, n } =
    useBulkSelect(excluirFormasPagamento);
  const [togglePending, startToggle] = useTransition();

  function toggleAtivo(id: string, ativo: boolean) {
    startToggle(async () => { await alterarFormaPagamento(id, !ativo); });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-3">
          Cadastradas ({formas.length})
        </h2>
        {podeExcluir && (
          <BulkDeleteToggle ativo={modoExcluir} onAtivar={ativar} onCancelar={cancelar} cancelarLabel="Cancelar" />
        )}
      </div>

      {formas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-3">Nenhuma forma cadastrada ainda.</div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {modoExcluir && (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger-soft dark:bg-red-900/10">
              <input type="checkbox" checked={n === formas.length && n > 0}
                onChange={(e) => toggleTodos(formas.map((f) => f.id), e.target.checked)} className="rounded" />
              <span className="text-xs text-danger">Selecionar todos</span>
            </div>
          )}
          {formas.map((fp) => (
            <div key={fp.id} className={`flex items-center gap-3 px-4 py-3 ${!fp.ativo ? "opacity-40" : ""} ${selecionados.has(fp.id) && modoExcluir ? "bg-danger-soft dark:bg-red-900/10" : ""}`}>
              {modoExcluir && (
                <input type="checkbox" checked={selecionados.has(fp.id)}
                  onChange={(e) => toggleItem(fp.id, e.target.checked)} className="rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-text">{fp.nome}</p>
                  {fp.is_faturamento_direto && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Faturamento Direto
                    </span>
                  )}
                </div>
                {fp.descricao && <p className="text-xs text-text-3">{fp.descricao}</p>}
              </div>
              {!modoExcluir && (
                <button type="button" disabled={togglePending}
                  onClick={() => toggleAtivo(fp.id, fp.ativo)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${fp.ativo
                    ? "border-green-200 bg-green-50 text-success hover:bg-green-100"
                    : "border-border bg-bg text-text-3 hover:bg-surface"
                  }`}>
                  {fp.ativo ? "Ativo" : "Inativo"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <BulkDeleteBar count={n} onConfirm={confirmarExclusao} onCancel={cancelar} pending={pending} erro={erro} label="forma(s) selecionada(s)" />
    </>
  );
}
