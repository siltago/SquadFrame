"use client";

import { useState } from "react";
import Link from "next/link";
import { ObraForm } from "./obra-form";
import type { WiseObra, WiseObraStatusRow, WiseCliente } from "@/modules/wise/works/types";
import type { WiseUnidade } from "@/modules/wise/organizations/types";

interface Props {
  obra: WiseObra;
  clientes: WiseCliente[];
  statusOptions: WiseObraStatusRow[];
  unidades: WiseUnidade[];
}

export function ObraDetalhe({
  obra, clientes, statusOptions, unidades,
}: Props) {
  const [editando, setEditando] = useState(false);

  const status = obra.status;
  const corStatus = status?.cor ?? "#94a3b8";

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-medium text-text-3">{obra.codigo ?? "—"}</span>
            {status && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${corStatus}20`, color: corStatus }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: corStatus }} />
                {status.nome}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{obra.nome}</h1>
          <p className="mt-1 text-sm text-text-2">
            {(obra.cliente as any)?.nome ?? "—"}
            {(obra.cidade || obra.estado) && (
              <> · {[obra.cidade, obra.estado].filter(Boolean).join(" / ")}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/squadframe/planejamento?aba=gerenciamento&obra=${obra.id}`} target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Lotes no Frame
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {(
          editando ? (
            <ObraForm
              obra={obra}
              clientes={clientes}
              statusOptions={statusOptions}
              unidades={unidades}
              onCancel={() => setEditando(false)}
              onSuccess={() => setEditando(false)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <dl className="card p-5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-3">Identificação</span>
                  <button
                    onClick={() => setEditando(true)}
                    className="flex items-center gap-1 text-xs font-medium text-text-3 hover:text-primary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                </div>
                {([
                  ["Código",  obra.codigo ?? "—"],
                  ["Cliente", (obra.cliente as any)?.nome ?? "—"],
                  ["Status",  status?.nome ?? "—"],
                  ["Unidade", (obra.unidade as any)?.nome ?? "—"],
                  ["Prazo",   obra.data_prevista
                    ? new Date(obra.data_prevista + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-text-3">{k}</dt>
                    <dd className="text-sm font-medium text-text mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <dl className="card p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-3 mb-2">Localização</div>
                {([
                  ["Endereço", obra.endereco ?? "—"],
                  ["Cidade",   obra.cidade   ?? "—"],
                  ["Estado",   obra.estado   ?? "—"],
                  ["CEP",      obra.cep      ?? "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-text-3">{k}</dt>
                    <dd className="text-sm font-medium text-text mt-0.5">{v}</dd>
                  </div>
                ))}
                {obra.observacoes && (
                  <div>
                    <dt className="text-xs text-text-3">Observações</dt>
                    <dd className="text-sm text-text-2 mt-0.5 whitespace-pre-wrap">{obra.observacoes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )
        )}
      </div>
    </div>
  );
}
