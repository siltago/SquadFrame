"use client";

import { useState } from "react";
import Link from "next/link";

export interface CarteiraLinhaObra {
  id: string;
  obra: { id: string; nome: string; codigo: string | null };
  saldo: number; // saldo desta obra com este fornecedor
  atualizadoEm: string;
}

export interface FornecedorComCarteiras {
  fornecedor: { id: string; nome: string };
  totalFornecedor: number; // pooled — soma em todas as obras
  carteiras: CarteiraLinhaObra[];
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

// Lista carteiras agrupadas por fornecedor, expansível — abrir um fornecedor
// mostra o saldo dele em cada obra. O total do fornecedor é o valor pooled
// (soma entre todas as obras), que é o que de fato está disponível pra gastar
// num pedido de faturamento direto — ver confirmar_debito_carteira.
export function CarteirasPorFornecedor({ fornecedores }: { fornecedores: FornecedorComCarteiras[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function alternar(fornecedorId: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(fornecedorId)) next.delete(fornecedorId);
      else next.add(fornecedorId);
      return next;
    });
  }

  return (
    <div className="card divide-y divide-border overflow-hidden">
      {fornecedores.map(({ fornecedor, totalFornecedor, carteiras }) => {
        const expandido = abertos.has(fornecedor.id);
        return (
          <div key={fornecedor.id}>
            <button
              type="button"
              onClick={() => alternar(fornecedor.id)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
            >
              <Chevron aberto={expandido} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{fornecedor.nome}</p>
                <p className="mt-0.5 text-xs text-text-3">
                  {carteiras.length} obra{carteiras.length !== 1 ? "s" : ""}
                </p>
              </div>
              <p className={`shrink-0 tabular-nums text-base font-bold ${totalFornecedor > 0 ? "text-success" : "text-danger"}`}>
                {fmt(totalFornecedor)}
              </p>
            </button>

            {expandido && (
              <div className="border-t border-border bg-bg/40 px-5 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {carteiras.map((c) => (
                    <Link
                      key={c.id}
                      href={`/squadframe/financeiro/carteiras/${c.id}`}
                      className="card p-3.5 hover:shadow-md transition-shadow"
                    >
                      <p className="truncate text-sm font-semibold text-text">
                        {c.obra.codigo && <span className="mr-1.5 font-mono text-xs text-text-3">[{c.obra.codigo}]</span>}
                        {c.obra.nome}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-text-3">Nesta obra</span>
                        <span className={`tabular-nums text-sm font-bold ${c.saldo > 0 ? "text-success" : "text-danger"}`}>
                          {fmt(c.saldo)}
                        </span>
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
