"use client";

import Link from "next/link";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { excluirSolicitacoes } from "@/app/squadframe/compras/actions";
import { STATUS_SOL_COR, STATUS_SOL_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/modules/squadframe/types/compras";
import { StatusPill } from "@/ui/components/StatusPill";
import { useBulkSelect } from "@/modules/squadframe/lib/use-bulk-select";
import { BulkDeleteToggle, BulkDeleteBar } from "@/modules/squadframe/components/bulk-delete-bar";

type Solicitacao = {
  id: string; numero: string; status: string; prioridade: string; origem: string;
  criado_em: string; obra: any; solicitante: any;
};

export function SolicitacoesLista({ solicitacoes }: { solicitacoes: Solicitacao[] }) {
  const podeExcluir = usePode("compras.solicitacao.criar");
  const { modoExcluir, ativar, cancelar, selecionados, toggleItem, toggleTodos, confirmarExclusao, pending, erro, n } =
    useBulkSelect(excluirSolicitacoes);

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
              {modoExcluir && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={n === solicitacoes.length && n > 0}
                    onChange={(e) => toggleTodos(solicitacoes.map((s) => s.id), e.target.checked)}
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
              <tr><td colSpan={modoExcluir ? 7 : 6} className="px-5 py-10 text-center text-sm text-text-3">Nenhuma solicitação encontrada.</td></tr>
            ) : (
              solicitacoes.map((s) => (
                <tr key={s.id} className={`border-b border-border last:border-0 ${modoExcluir ? (selecionados.has(s.id) ? "bg-danger-soft dark:bg-red-900/10" : "hover:bg-bg") : "hover:bg-bg"}`}>
                  {modoExcluir && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selecionados.has(s.id)}
                        onChange={(e) => toggleItem(s.id, e.target.checked)} className="rounded" />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <Link href={`/squadframe/compras/solicitacoes/${s.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {s.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text-2">{s.obra?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-text-2">{s.solicitante?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusPill size="xs" cor={STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR]} label={STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL]} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill size="xs" cor={PRIORIDADE_COR[s.prioridade as keyof typeof PRIORIDADE_COR]} label={PRIORIDADE_LABEL[s.prioridade as keyof typeof PRIORIDADE_LABEL]} />
                  </td>
                  <td className="px-5 py-3 text-xs text-text-3">{new Date(s.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BulkDeleteBar count={n} onConfirm={confirmarExclusao} onCancel={cancelar} pending={pending} erro={erro} label="solicitação(ões) selecionada(s)" />
    </>
  );
}
