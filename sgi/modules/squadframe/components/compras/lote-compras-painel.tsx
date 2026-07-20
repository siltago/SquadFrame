"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureContextoAction } from "@/modules/squadframe/package-procurement/actions";
import { vincularPedidoLote } from "@/app/squadframe/compras/actions";
import { STATUS_PED_LABEL, STATUS_PED_COR } from "@/modules/squadframe/types/compras";
import type {
  WiseNecessidade, CoberturaNecessidade, StatusSuprimentosCalculado,
} from "@/modules/squadframe/package-procurement/types";

const STATUS_SUPRIMENTOS_LABEL: Record<StatusSuprimentosCalculado, string> = {
  SEM_NECESSIDADES: "Sem necessidades",
  PENDENTE_DE_COMPRA: "Pendente de compra",
  COMPRA_PARCIAL: "Compra parcial",
  PEDIDOS_EMITIDOS: "Pedidos emitidos",
  RECEBIMENTO_PARCIAL: "Recebimento parcial",
  MATERIAL_RECEBIDO: "Material recebido",
};

const CRITICIDADE_CLS: Record<string, string> = {
  BAIXA: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  BLOQUEANTE: "bg-red-100 text-red-600",
};

type PedidoResumo = {
  id: string;
  numero: string;
  status: string;
  fornecedor: { nome: string } | null;
  criado_em: string;
};

function PedidoBadge({ status }: { status: string }) {
  const cor = STATUS_PED_COR[status as keyof typeof STATUS_PED_COR];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cor + "20", color: cor }}
    >
      {STATUS_PED_LABEL[status as keyof typeof STATUS_PED_LABEL] ?? status}
    </span>
  );
}

export function LoteComprasPainel({
  loteId, obraId, contextoExiste: contextoExisteInicial, necessidades, cobertura, statusSuprimentos,
  pedidosDoLote, pedidosSoltos,
}: {
  loteId: string;
  obraId: string;
  contextoExiste: boolean;
  necessidades: WiseNecessidade[];
  cobertura: CoberturaNecessidade[];
  statusSuprimentos: StatusSuprimentosCalculado;
  pedidosDoLote: PedidoResumo[];
  pedidosSoltos: PedidoResumo[];
}) {
  const router = useRouter();
  const [contextoExiste, setContextoExiste] = useState(contextoExisteInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ativas = necessidades.filter((n) => n.estado_administrativo === "ATIVA");
  const coberturaPorNecessidade = new Map(cobertura.map((c) => [c.necessidade_id, c]));

  function prepararContexto() {
    startTransition(async () => {
      const resultado = await ensureContextoAction(loteId);
      if (resultado.ok) setContextoExiste(true);
      else setErro(resultado.erro);
    });
  }

  function vincular(pedidoId: string) {
    setErro(null);
    setVinculando(pedidoId);
    startTransition(async () => {
      try {
        await vincularPedidoLote(pedidoId, loteId);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível vincular o pedido.");
      } finally {
        setVinculando(null);
      }
    });
  }

  if (!contextoExiste) {
    return (
      <div className="card px-5 py-8 text-center space-y-3">
        <p className="text-sm text-text-3">Este lote ainda não tem contexto de Compras.</p>
        <button
          type="button"
          disabled={isPending}
          onClick={prepararContexto}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Preparando…" : "Preparar contexto de Compras"}
        </button>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</div>
      )}

      {/* Necessidades do lote */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Necessidades de material</p>
            <p className="mt-1 text-sm text-text-2">
              {STATUS_SUPRIMENTOS_LABEL[statusSuprimentos]} — {ativas.length} ativa(s)
            </p>
          </div>
          {ativas.length > 0 && (
            <Link
              href={`/squadframe/compras/pedidos/novo?lote_id=${loteId}&obra_id=${obraId}&origem_contexto=LEVANTAMENTO_NECESSIDADES`}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Gerar pedido a partir do levantamento
            </Link>
          )}
        </div>

        {ativas.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Necessário</th>
                  <th className="py-2 pr-3 font-medium">Solicitado</th>
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 pr-3 font-medium">Recebido</th>
                  <th className="py-2 pr-3 font-medium">Criticidade</th>
                </tr>
              </thead>
              <tbody>
                {ativas.map((n) => {
                  const cob = coberturaPorNecessidade.get(n.id);
                  return (
                    <tr key={n.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">
                        {n.produto ? (
                          <span>
                            <span className="font-mono text-xs text-text-3">{n.produto.codigo_mestre}</span>{" "}
                            {n.produto.nome}
                          </span>
                        ) : (
                          n.descricao_livre ?? "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">{n.quantidade_necessaria} {n.unidade}</td>
                      <td className="py-2 pr-3 text-text-2">{cob?.solicitado ?? 0}</td>
                      <td className="py-2 pr-3 text-text-2">{cob?.pedido ?? 0}</td>
                      <td className="py-2 pr-3 text-text-2">{cob?.recebido ?? 0}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CRITICIDADE_CLS[n.criticidade]}`}>
                          {n.criticidade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {ativas.length === 0 && (
          <p className="mt-3 text-sm text-text-3">Nenhuma necessidade ativa neste lote.</p>
        )}
      </div>

      {/* Pedidos vinculados a este lote */}
      <div className="card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Pedidos vinculados a este lote</p>
        {pedidosDoLote.length === 0 ? (
          <p className="mt-3 text-sm text-text-3">Nenhum pedido vinculado ainda.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {pedidosDoLote.map((p) => (
              <Link
                key={p.id}
                href={`/squadframe/compras/pedidos/${p.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
              >
                <span className="font-medium">{p.numero}</span>
                <span className="flex-1 text-text-2">{p.fornecedor?.nome ?? "—"}</span>
                <PedidoBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Vincular pedido existente (solto, mesma obra) */}
      <div className="card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">
          Vincular pedido existente (sem lote, mesma obra)
        </p>
        {pedidosSoltos.length === 0 ? (
          <p className="mt-3 text-sm text-text-3">Nenhum pedido solto nesta obra.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {pedidosSoltos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium">{p.numero}</span>
                <span className="flex-1 text-text-2">{p.fornecedor?.nome ?? "—"}</span>
                <PedidoBadge status={p.status} />
                <button
                  type="button"
                  disabled={isPending && vinculando === p.id}
                  onClick={() => vincular(p.id)}
                  className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {isPending && vinculando === p.id ? "Vinculando…" : "Vincular a este lote"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
