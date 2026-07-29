"use client";

import { useState } from "react";
import Link from "next/link";

export interface CarteiraLinha {
  id: string;
  fornecedor: { id: string; nome: string };
  saldo: number;         // saldo desta obra com este fornecedor
  totalPooled: number;   // saldo agregado do fornecedor em todas as obras
  atualizadoEm: string;
}

export interface ObraComCarteiras {
  obra: { id: string; nome: string; codigo: string | null };
  totalObra: number;
  carteiras: CarteiraLinha[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-text-3 transition-transform duration-150 ${aberto ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Lista carteiras agrupadas por obra, expansível — abrir uma obra mostra a
// carteira dela em cada fornecedor, lado a lado com o saldo pooled desse
// fornecedor (soma em todas as obras, que é o que de fato está disponível
// pra gastar num pedido de faturamento direto — ver confirmar_debito_carteira).
export function CarteirasPorObra({ obras }: { obras: ObraComCarteiras[] }) {
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  function alternar(obraId: string) {
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(obraId)) next.delete(obraId);
      else next.add(obraId);
      return next;
    });
  }

  return (
    <div className="card divide-y divide-border overflow-hidden">
      {obras.map(({ obra, totalObra, carteiras }) => {
        const expandida = abertas.has(obra.id);
        return (
          <div key={obra.id}>
            <button
              type="button"
              onClick={() => alternar(obra.id)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
            >
              <Chevron aberto={expandida} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {obra.codigo && <span className="mr-1.5 font-mono text-xs text-text-3">[{obra.codigo}]</span>}
                  {obra.nome}
                </p>
                <p className="mt-0.5 text-xs text-text-3">
                  {carteiras.length} fornecedor{carteiras.length !== 1 ? "es" : ""}
                </p>
              </div>
              <p className={`shrink-0 tabular-nums text-base font-bold ${totalObra > 0 ? "text-success" : "text-danger"}`}>
                {fmt(totalObra)}
              </p>
            </button>

            {expandida && (
              <div className="border-t border-border bg-bg/40 px-5 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {carteiras.map((c) => (
                    <Link
                      key={c.id}
                      href={`/squadframe/financeiro/carteiras/${c.id}`}
                      className="card p-3.5 hover:shadow-md transition-shadow"
                    >
                      <p className="truncate text-sm font-semibold text-text">{c.fornecedor.nome}</p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-text-3">Nesta obra</span>
                        <span className={`tabular-nums text-sm font-bold ${c.saldo > 0 ? "text-success" : "text-danger"}`}>
                          {fmt(c.saldo)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-text-3">Total no fornecedor</span>
                        <span className="tabular-nums text-xs font-medium text-text-2">{fmt(c.totalPooled)}</span>
                      </div>
                      <p className="mt-2 text-[10px] text-text-3">
                        Ver extrato → · {new Date(c.atualizadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
