"use client";

import { useState } from "react";
import Link from "next/link";
import { ObraForm } from "./obra-form";
import type {
  WiseObra, WiseObraStatusRow, WiseCliente,
  WiseLoteComTipologias,
} from "@/modules/wise/works/types";
import type { WiseUnidade } from "@/modules/wise/organizations/types";

type Aba = "informacoes" | "edicao";

const ABAS: { slug: Aba; label: string }[] = [
  { slug: "informacoes", label: "Informações" },
  { slug: "edicao",      label: "Edição"      },
];

const PRIORIDADE_CLS: Record<string, string> = {
  BAIXA:   "text-slate-500",
  MEDIA:   "text-blue-500",
  ALTA:    "text-orange-500",
  CRITICA: "text-red-600",
};

interface Props {
  obra: WiseObra;
  clientes: WiseCliente[];
  statusOptions: WiseObraStatusRow[];
  unidades: WiseUnidade[];
  lotes: WiseLoteComTipologias[];
}

export function ObraDetalhe({
  obra, clientes, statusOptions, unidades, lotes,
}: Props) {
  const [aba, setAba] = useState<Aba>("informacoes");
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
            href={`/squadframe/obras/${obra.id}`} target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Frame
          </Link>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {ABAS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => { setAba(slug); setEditando(false); }}
            className={
              aba === slug
                ? "shrink-0 border-b-2 border-primary px-4 py-2.5 text-sm font-medium text-text"
                : "shrink-0 px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Informações */}
        {aba === "informacoes" && (
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

        {/* Edição — lista de lotes */}
        {aba === "edicao" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-3">{lotes.length} lote(s)</p>
              <Link
                href={`/squadframe/obras/${obra.id}?aba=producao`} target="_blank"
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Gerenciar no Frame
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>

            {lotes.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-sm text-text-3">Nenhum lote criado ainda.</p>
                <Link
                  href={`/squadframe/obras/${obra.id}?aba=producao`} target="_blank"
                  className="inline-flex mt-3 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Criar lote no SquadFrame
                </Link>
              </div>
            ) : (
              <div className="card divide-y divide-border">
                {lotes.map((lote) => {
                  const pesoTotal = lote.tipologias.reduce(
                    (s, t) => s + (t.peso_unit ?? 0) * t.quantidade, 0
                  );
                  const concluidas = lote.tipologias.filter(
                    (t) => t.status === "pronto" || t.status === "entregue"
                  ).length;
                  const progresso = lote.tipologias.length > 0
                    ? Math.round((concluidas / lote.tipologias.length) * 100)
                    : 0;

                  return (
                    <Link
                      key={lote.id}
                      href={`/squadwise/obras/${obra.id}/lotes/${lote.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-bg transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                          {lote.nome}
                        </span>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-text-3 tabular-nums">
                          <span>{lote.tipologias.length} tip.</span>
                          {pesoTotal > 0 && <span>{pesoTotal.toFixed(1)} kg</span>}
                          {lote.prioridade && (
                            <span className={PRIORIDADE_CLS[lote.prioridade] ?? ""}>
                              {lote.prioridade.charAt(0) + lote.prioridade.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-text-2">{progresso}%</span>
                        <div className="h-1.5 w-20 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          className="text-text-3 group-hover:text-primary transition-colors">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
