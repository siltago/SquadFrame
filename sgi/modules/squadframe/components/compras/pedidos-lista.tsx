"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { excluirPedidos } from "@/app/squadframe/compras/actions";
import { Button } from "@/ui/components/Button";
import { STATUS_PED_COR, STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";

type Pedido = {
  id: string; numero: string; status: string; prazo_entrega: string | null;
  criado_em: string; obra: any; fornecedor: any; comprador: any;
};

export function PedidosLista({ pedidos }: { pedidos: Pedido[] }) {
  const podeExcluir = usePode("compras.pedido.excluir");
  const [modoExcluir, setModoExcluir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleItem(id: string, checked: boolean) {
    setSelecionados((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }
  function toggleTodos(checked: boolean) {
    setSelecionados(checked ? new Set(pedidos.map((p) => p.id)) : new Set());
  }
  function cancelar() { setModoExcluir(false); setSelecionados(new Set()); setErro(null); }
  function confirmarExclusao() {
    setErro(null);
    start(async () => {
      try { await excluirPedidos(Array.from(selecionados)); cancelar(); }
      catch (e: any) { setErro(e.message); }
    });
  }

  const n = selecionados.size;

  return (
    <>
      {podeExcluir && (
        <div className="flex justify-end mb-2">
          {!modoExcluir ? (
            <button onClick={() => setModoExcluir(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-danger dark:hover:bg-red-900/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Excluir
            </button>
          ) : (
            <button onClick={cancelar} className="text-xs text-text-3 hover:text-text underline">Cancelar exclusão</button>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              {modoExcluir && <th className="px-4 py-3 w-8"><input type="checkbox" checked={n === pedidos.length && n > 0} onChange={(e) => toggleTodos(e.target.checked)} className="rounded" /></th>}
              <th className="px-5 py-3 font-medium">Número</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Obra</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr><td colSpan={modoExcluir ? 6 : 5} className="px-5 py-10 text-center text-sm text-text-3">Nenhum pedido encontrado.</td></tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id} className={`border-b border-border last:border-0 ${selecionados.has(p.id) && modoExcluir ? "bg-danger-soft dark:bg-red-900/10" : "hover:bg-bg"}`}>
                  {modoExcluir && (
                    <td className="px-4 py-3"><input type="checkbox" checked={selecionados.has(p.id)} onChange={(e) => toggleItem(p.id, e.target.checked)} className="rounded" /></td>
                  )}
                  <td className="px-5 py-3">
                    <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{p.numero}</Link>
                  </td>
                  <td className="px-5 py-3 text-text-2">{p.fornecedor?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-text-2">{p.obra?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] + "20", color: STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] }}>
                      {STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-3">{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modoExcluir && n > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-danger-soft px-8 py-3 shadow-lg dark:bg-red-900/20">
          <p className="text-sm font-medium text-danger dark:text-danger">{n} pedido(s) selecionado(s)</p>
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
