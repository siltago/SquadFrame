"use client";

import { useState } from "react";
import Link from "next/link";

export interface PedidoStatusItem {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  dias: number;
}

export interface PedidoStatusCount {
  status: string;
  label: string;
  total: number;
  itens: PedidoStatusItem[];
}

export interface SolicitacaoStatusItem {
  id: string;
  numero: string;
  obra: string;
  solicitante: string;
  dias: number;
}

export interface SolicitacaoStatusCount {
  status: string;
  label: string;
  total: number;
  itens: SolicitacaoStatusItem[];
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-text-3 transition-transform duration-150 ${aberto ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Comparação de magnitude entre categorias — um hue só (sequencial), barra
// com extremidade arredondada, valor direto na ponta. Cada linha é clicável
// e expande a lista de itens daquele status (refinamento).
export function StatusBarChart<T extends { id: string; numero: string }>({
  titulo,
  dados,
  renderItem,
}: {
  titulo: string;
  dados: { status: string; label: string; total: number; itens: T[] }[];
  renderItem: (item: T) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const max = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-text">{titulo}</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-text-3">Nenhum dado ainda.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-1">
          {dados.map((d) => {
            const expandido = aberto === d.status;
            return (
              <div key={d.status}>
                <button
                  type="button"
                  onClick={() => setAberto(expandido ? null : d.status)}
                  className="-mx-1 flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-bg"
                >
                  <Chevron aberto={expandido} />
                  <span className="w-32 shrink-0 truncate text-left text-xs text-text-2">{d.label}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-surface-2">
                    <div
                      className="h-2.5 rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-text">{d.total}</span>
                </button>
                {expandido && (
                  <div className="ml-8 mb-2 mt-1 flex flex-col gap-0.5 border-l-2 border-border pl-4">
                    {d.itens.length === 0 ? (
                      <p className="py-1 text-xs text-text-3">Nenhum item.</p>
                    ) : d.itens.map((item) => (
                      <div key={item.id}>{renderItem(item)}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PedidoStatusItemRow({ item }: { item: PedidoStatusItem }) {
  return (
    <Link
      href={`/squadframe/compras/pedidos/${item.id}`}
      className="flex items-center gap-2 rounded-md py-1 text-xs hover:bg-bg"
    >
      <span className="shrink-0 font-mono font-semibold text-primary">{item.numero}</span>
      <span className="min-w-0 flex-1 truncate text-text-2">{item.obra} · {item.fornecedor}</span>
      <span className="shrink-0 text-text-3">{item.dias}d</span>
    </Link>
  );
}

export function SolicitacaoStatusItemRow({ item }: { item: SolicitacaoStatusItem }) {
  return (
    <Link
      href={`/squadframe/compras/solicitacoes/${item.id}`}
      className="flex items-center gap-2 rounded-md py-1 text-xs hover:bg-bg"
    >
      <span className="shrink-0 font-mono font-semibold text-primary">{item.numero}</span>
      <span className="min-w-0 flex-1 truncate text-text-2">{item.obra} · {item.solicitante}</span>
      <span className="shrink-0 text-text-3">{item.dias}d</span>
    </Link>
  );
}
