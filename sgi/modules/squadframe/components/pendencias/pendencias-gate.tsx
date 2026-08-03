"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registrarJustificativaPendencia, adiarPendenciasParaAmanha } from "@/app/squadframe/compras/actions";
import { PENDENCIA_LABEL, type Pendencia } from "@/modules/squadframe/services/pendencias/types";

function rotaPedido(pedidoId: string): string {
  return `/squadframe/compras/pedidos/${pedidoId}`;
}

function ItemPendencia({
  pendencia,
  onHandled,
}: {
  pendencia: Pendencia;
  onHandled: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function enviar() {
    if (!motivo.trim()) { setErro("Descreva o motivo."); return; }
    setErro(null);
    start(async () => {
      try {
        await registrarJustificativaPendencia(pendencia.pedidoId, pendencia.tipo, motivo);
        onHandled();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            Pedido {pendencia.numero}
            {pendencia.fornecedorNome && <span className="font-normal text-text-2"> — {pendencia.fornecedorNome}</span>}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            {PENDENCIA_LABEL[pendencia.tipo]} · aberto há {pendencia.diasEmAberto} dia{pendencia.diasEmAberto === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={rotaPedido(pendencia.pedidoId)}
          onClick={onHandled}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg"
        >
          Ir para o pedido →
        </Link>
      </div>

      {pendencia.ultimoMotivo && (
        <p className="mt-2 rounded-md bg-bg px-2.5 py-1.5 text-xs text-text-3">
          Motivo anterior: “{pendencia.ultimoMotivo}”
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Por que ainda não foi resolvido? (ex: fornecedor não devolveu)"
          className="field h-8 min-w-[240px] flex-1 text-xs"
        />
        <button
          disabled={pending}
          onClick={enviar}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Registrando…" : "Registrar motivo"}
        </button>
      </div>
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
    </div>
  );
}

export function PendenciasGate({ pendenciasIniciais }: { pendenciasIniciais: Pendencia[] }) {
  const [pendentes, setPendentes] = useState(pendenciasIniciais);
  const [minimizado, setMinimizado] = useState(false);
  const [adiando, startAdiar] = useTransition();

  if (pendentes.length === 0) return null;

  function remover(chave: string) {
    setPendentes((prev) => prev.filter((p) => `${p.pedidoId}:${p.tipo}` !== chave));
  }

  function minimizar() {
    startAdiar(async () => {
      await adiarPendenciasParaAmanha();
      setMinimizado(true);
    });
  }

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-lg hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
      >
        {pendentes.length} pendência{pendentes.length === 1 ? "" : "s"} adiada{pendentes.length === 1 ? "" : "s"} pra amanhã
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-bg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Pendências de compras</p>
            <h2 className="mt-1 text-xl font-bold text-text">
              Você tem {pendentes.length} pendência{pendentes.length === 1 ? "" : "s"} em aberto
            </h2>
          </div>
          <button
            onClick={minimizar}
            disabled={adiando}
            title="Minimizar e cobrar de novo amanhã"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg disabled:opacity-50"
          >
            {adiando ? "Adiando…" : "Lembrar amanhã"}
          </button>
        </div>
        <p className="mt-1.5 text-sm text-text-2">
          Resolva no pedido ou registre por que ainda não foi possível — o motivo fica salvo no seu histórico.
        </p>

        <div className="mt-5 space-y-3">
          {pendentes.map((p) => (
            <ItemPendencia
              key={`${p.pedidoId}:${p.tipo}`}
              pendencia={p}
              onHandled={() => remover(`${p.pedidoId}:${p.tipo}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
