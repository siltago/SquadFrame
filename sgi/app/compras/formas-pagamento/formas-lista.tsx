"use client";

import { useState, useTransition } from "react";
import { usePode } from "@/components/user-provider";
import { alterarFormaPagamento, excluirFormasPagamento } from "@/app/compras/actions";

type FormasPagamento = { id: string; nome: string; descricao: string | null; ativo: boolean };

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
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Cadastradas ({formas.length})
        </h2>
        {podeExcluir && (
          !modoExcluir ? (
            <button onClick={() => setModoExcluir(true)}
              className="inline-flex items-center gap-1.5 rounded-card border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Excluir
            </button>
          ) : (
            <button onClick={cancelar} className="text-xs text-ink-faint hover:text-ink underline">Cancelar</button>
          )
        )}
      </div>

      {formas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">Nenhuma forma cadastrada ainda.</div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {modoExcluir && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10">
              <input type="checkbox" checked={n === formas.length && n > 0}
                onChange={(e) => toggleTodos(e.target.checked)} className="rounded" />
              <span className="text-xs text-red-600">Selecionar todos</span>
            </div>
          )}
          {formas.map((fp) => (
            <div key={fp.id} className={`flex items-center gap-3 px-4 py-3 ${!fp.ativo ? "opacity-40" : ""} ${selecionados.has(fp.id) && modoExcluir ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
              {modoExcluir && (
                <input type="checkbox" checked={selecionados.has(fp.id)}
                  onChange={(e) => toggleItem(fp.id, e.target.checked)} className="rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{fp.nome}</p>
                {fp.descricao && <p className="text-xs text-ink-faint">{fp.descricao}</p>}
              </div>
              {!modoExcluir && (
                <button type="button" disabled={togglePending}
                  onClick={() => toggleAtivo(fp.id, fp.ativo)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${fp.ativo
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-line bg-canvas text-ink-faint hover:bg-surface"
                  }`}>
                  {fp.ativo ? "Ativo" : "Inativo"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modoExcluir && n > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-red-50 px-8 py-3 shadow-lg dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{n} forma(s) selecionada(s)</p>
          <div className="flex items-center gap-3">
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button onClick={cancelar} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={confirmarExclusao} disabled={pending}
              className="rounded-card border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {pending ? "Excluindo…" : `Excluir ${n}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
