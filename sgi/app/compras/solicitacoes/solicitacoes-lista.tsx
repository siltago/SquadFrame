"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePode } from "@/components/user-provider";
import { excluirSolicitacoes } from "@/app/compras/actions";
import { STATUS_SOL_COR, STATUS_SOL_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/types/compras";

type Solicitacao = {
  id: string; numero: string; status: string; prioridade: string; origem: string;
  criado_em: string; obra: any; solicitante: any;
};

export function SolicitacoesLista({ solicitacoes }: { solicitacoes: Solicitacao[] }) {
  const podeExcluir = usePode("compras.solicitacao.criar");
  const [modoExcluir, setModoExcluir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleItem(id: string, checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function toggleTodos(checked: boolean) {
    setSelecionados(checked ? new Set(solicitacoes.map((s) => s.id)) : new Set());
  }

  function cancelar() { setModoExcluir(false); setSelecionados(new Set()); setErro(null); }

  function confirmarExclusao() {
    setErro(null);
    start(async () => {
      try {
        await excluirSolicitacoes(Array.from(selecionados));
        cancelar();
      } catch (e: any) { setErro(e.message); }
    });
  }

  const n = selecionados.size;

  return (
    <>
      {podeExcluir && (
        <div className="flex justify-end mb-2">
          {!modoExcluir ? (
            <button onClick={() => setModoExcluir(true)}
              className="inline-flex items-center gap-1.5 rounded-card border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Excluir
            </button>
          ) : (
            <button onClick={cancelar} className="text-xs text-ink-faint hover:text-ink underline">
              Cancelar exclusão
            </button>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              {modoExcluir && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={n === solicitacoes.length && n > 0}
                    onChange={(e) => toggleTodos(e.target.checked)}
                    className="rounded" />
                </th>
              )}
              <th className="px-5 py-3 font-medium">Número</th>
              <th className="px-5 py-3 font-medium">Obra</th>
              <th className="px-5 py-3 font-medium">Solicitante</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Prioridade</th>
              <th className="px-5 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {solicitacoes.length === 0 ? (
              <tr><td colSpan={modoExcluir ? 7 : 6} className="px-5 py-10 text-center text-sm text-ink-faint">Nenhuma solicitação encontrada.</td></tr>
            ) : (
              solicitacoes.map((s) => (
                <tr key={s.id} className={`border-b border-line last:border-0 ${modoExcluir ? (selecionados.has(s.id) ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-canvas") : "hover:bg-canvas"}`}>
                  {modoExcluir && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selecionados.has(s.id)}
                        onChange={(e) => toggleItem(s.id, e.target.checked)} className="rounded" />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <Link href={`/compras/solicitacoes/${s.id}`} className="font-mono text-xs font-semibold text-steel hover:underline">
                      {s.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{s.obra?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.solicitante?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] + "20", color: STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] }}>
                      {STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: PRIORIDADE_COR[s.prioridade as keyof typeof PRIORIDADE_COR] + "20", color: PRIORIDADE_COR[s.prioridade as keyof typeof PRIORIDADE_COR] }}>
                      {PRIORIDADE_LABEL[s.prioridade as keyof typeof PRIORIDADE_LABEL]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-faint">{new Date(s.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de exclusão */}
      {modoExcluir && n > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-red-50 px-8 py-3 shadow-lg dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {n} solicitação(ões) selecionada(s)
          </p>
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
