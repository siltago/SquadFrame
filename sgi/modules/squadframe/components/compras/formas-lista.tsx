"use client";

import { useState, useTransition } from "react";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { alterarFormaPagamento, excluirFormasPagamento } from "@/app/squadframe/compras/actions";
import { Button } from "@/ui/components/Button";

type FormasPagamento = { id: string; nome: string; descricao: string | null; ativo: boolean; is_faturamento_direto: boolean };

export function FormasPagamentoLista({ formas }: { formas: FormasPagamento[] }) {
  const podeExcluir = usePode("compras.formapagamento.gerenciar");
  const [modoExcluir, setModoExcluir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [togglePending, startToggle] = useTransition();

  function toggleItem(id: string, checked: boolean) {
    setSelecionados((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }
  function toggleTodos(checked: boolean) {
    setSelecionados(checked ? new Set(formas.map((f) => f.id)) : new Set());
  }
  function cancelar() { setModoExcluir(false); setSelecionados(new Set()); setErro(null); }
  function confirmarExclusao() {
    setErro(null);
    start(async () => {
      try { await excluirFormasPagamento(Array.from(selecionados)); cancelar(); }
      catch (e: any) { setErro(e.message); }
    });
  }
  function toggleAtivo(id: string, ativo: boolean) {
    startToggle(async () => { await alterarFormaPagamento(id, !ativo); });
  }

  const n = selecionados.size;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-3">
          Cadastradas ({formas.length})
        </h2>
        {podeExcluir && (
          !modoExcluir ? (
            <button onClick={() => setModoExcluir(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-danger dark:hover:bg-red-900/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Excluir
            </button>
          ) : (
            <button onClick={cancelar} className="text-xs text-text-3 hover:text-text underline">Cancelar</button>
          )
        )}
      </div>

      {formas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-3">Nenhuma forma cadastrada ainda.</div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {modoExcluir && (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger-soft dark:bg-red-900/10">
              <input type="checkbox" checked={n === formas.length && n > 0}
                onChange={(e) => toggleTodos(e.target.checked)} className="rounded" />
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

      {modoExcluir && n > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-danger-soft px-8 py-3 shadow-lg dark:bg-red-900/20">
          <p className="text-sm font-medium text-danger dark:text-danger">{n} forma(s) selecionada(s)</p>
          <div className="flex items-center gap-3">
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <Button variant="ghost" onClick={cancelar} className="text-sm">Cancelar</Button>
            <button onClick={confirmarExclusao} disabled={pending}
              className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {pending ? "Excluindo…" : `Excluir ${n}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
