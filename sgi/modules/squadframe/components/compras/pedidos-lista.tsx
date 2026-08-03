"use client";

import Link from "next/link";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { excluirPedidos } from "@/app/squadframe/compras/actions";
import { STATUS_PED_COR, STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";
import { StatusPill } from "@/ui/components/StatusPill";
import { useBulkSelect } from "@/modules/squadframe/lib/use-bulk-select";
import { BulkDeleteToggle, BulkDeleteBar } from "@/modules/squadframe/components/bulk-delete-bar";

type Pedido = {
  id: string; numero: string; status: string; prazo_entrega: string | null;
  criado_em: string; obra: any; fornecedor: any; comprador: any;
};

// Mesma condição usada pro contador de "Destaques" na home (ver
// app/squadframe/page.tsx) — só pedido esperando material com prazo já
// vencido conta como atrasado.
function estaAtrasado(p: Pedido, hojeISO: string): boolean {
  return p.status === "AGUARDANDO_RECEBIMENTO" && !!p.prazo_entrega && p.prazo_entrega < hojeISO;
}

export function PedidosLista({ pedidos, hojeISO }: { pedidos: Pedido[]; hojeISO: string }) {
  const podeExcluir = usePode("compras.pedido.excluir");
  const { modoExcluir, ativar, cancelar, selecionados, toggleItem, toggleTodos, confirmarExclusao, pending, erro, n } =
    useBulkSelect(excluirPedidos);

  return (
    <>
      {podeExcluir && (
        <div className="flex justify-end mb-2">
          <BulkDeleteToggle ativo={modoExcluir} onAtivar={ativar} onCancelar={cancelar} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              {modoExcluir && <th className="px-4 py-3 w-8"><input type="checkbox" checked={n === pedidos.length && n > 0} onChange={(e) => toggleTodos(pedidos.map((p) => p.id), e.target.checked)} className="rounded" /></th>}
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill size="xs" cor={STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR]} label={STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL]} />
                      {estaAtrasado(p, hojeISO) && <StatusPill size="xs" cor="#ef4444" label="Atraso" />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-3">{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BulkDeleteBar count={n} onConfirm={confirmarExclusao} onCancel={cancelar} pending={pending} erro={erro} label="pedido(s) selecionado(s)" />
    </>
  );
}
