"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transicionarStatusAction } from "@/modules/wise/work-packages/actions";
import {
  STATUS_LABEL, STATUS_COR, PRIORIDADE_LABEL, PRIORIDADE_COR,
  type WisePacote, type WisePacoteStatus, type WisePacoteModulo,
} from "@/modules/wise/work-packages/types";
import { PacoteForm } from "./pacote-form";

const PROXIMOS_STATUS: Partial<Record<WisePacoteStatus, WisePacoteStatus[]>> = {
  RASCUNHO:  ["ATIVO", "CANCELADO"],
  ATIVO:     ["SUSPENSO", "CONCLUIDO", "CANCELADO"],
  SUSPENSO:  ["ATIVO", "CANCELADO"],
};

function PacoteRow({
  pacote, obraId, responsaveis,
}: {
  pacote: WisePacote;
  obraId: string;
  responsaveis: { id: string; nome: string }[];
}) {
  const [expandido, setExpandido] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function transicionar(novoStatus: WisePacoteStatus) {
    if (!confirm(`Alterar status para "${STATUS_LABEL[novoStatus]}"?`)) return;
    start(async () => {
      await transicionarStatusAction(pacote.id, obraId, novoStatus);
      router.refresh();
    });
  }

  const proximos = PROXIMOS_STATUS[pacote.status] ?? [];
  const modulosAtivos = (pacote.modulos ?? []).filter((m) => m.habilitado).map((m) => m.modulo);

  return (
    <div className={`border border-border rounded-xl overflow-hidden ${pending ? "opacity-50" : ""}`}>
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 text-text-3 transition-transform ${expandido ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pacote.codigo && (
              <span className="font-mono text-xs font-semibold text-text-3">{pacote.codigo}</span>
            )}
            <span className="text-sm font-medium text-text truncate">{pacote.nome}</span>
          </div>
          {(pacote.responsavel || pacote.prazo) && (
            <p className="text-xs text-text-3 mt-0.5">
              {pacote.responsavel && <>{(pacote.responsavel as any).nome}</>}
              {pacote.responsavel && pacote.prazo && " · "}
              {pacote.prazo && <>Prazo: {new Date(pacote.prazo + "T00:00:00").toLocaleDateString("pt-BR")}</>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {pacote.prioridade && (
            <span className={`text-xs font-medium ${PRIORIDADE_COR[pacote.prioridade]}`}>
              {PRIORIDADE_LABEL[pacote.prioridade]}
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[pacote.status]}`}>
            {STATUS_LABEL[pacote.status]}
          </span>
        </div>
      </div>

      {/* Expansão */}
      {expandido && (
        <div className="border-t border-border bg-bg px-4 py-4 space-y-4">
          {editando ? (
            <PacoteForm
              obraId={obraId}
              obraNome={(pacote.obra as any)?.nome ?? ""}
              pacote={pacote}
              responsaveis={responsaveis}
              onCancel={() => setEditando(false)}
              onSuccess={() => { setEditando(false); router.refresh(); }}
            />
          ) : (
            <>
              {pacote.descricao && (
                <p className="text-sm text-text-2">{pacote.descricao}</p>
              )}

              {/* Módulos */}
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-3 mb-1.5">Módulos</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["frame","board","flow","stock","measure"] as WisePacoteModulo[]).map((m) => (
                    <span key={m}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        modulosAtivos.includes(m)
                          ? "bg-primary/10 text-primary"
                          : "bg-surface text-text-3 line-through"
                      }`}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setEditando(true)}
                  className="text-xs font-medium text-text-2 hover:text-text underline-offset-2 hover:underline">
                  Editar
                </button>
                {proximos.map((s) => (
                  <button key={s} onClick={() => transicionar(s)}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                    → {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PacotesLista({
  pacotes, obraId, responsaveis,
}: {
  pacotes: WisePacote[];
  obraId: string;
  responsaveis: { id: string; nome: string }[];
}) {
  if (pacotes.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-text-3">Nenhum pacote de trabalho criado ainda.</p>
      </div>
    );
  }

  const agrupados = {
    RASCUNHO:  pacotes.filter((p) => p.status === "RASCUNHO"),
    ATIVO:     pacotes.filter((p) => p.status === "ATIVO"),
    SUSPENSO:  pacotes.filter((p) => p.status === "SUSPENSO"),
    CONCLUIDO: pacotes.filter((p) => p.status === "CONCLUIDO"),
    CANCELADO: pacotes.filter((p) => p.status === "CANCELADO"),
  } satisfies Record<WisePacoteStatus, WisePacote[]>;

  return (
    <div className="space-y-6">
      {(Object.entries(agrupados) as [WisePacoteStatus, WisePacote[]][])
        .filter(([, lista]) => lista.length > 0)
        .map(([status, lista]) => (
          <div key={status}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
              {STATUS_LABEL[status as WisePacoteStatus]} ({lista.length})
            </p>
            <div className="space-y-2">
              {lista.map((p) => (
                <PacoteRow key={p.id} pacote={p} obraId={obraId} responsaveis={responsaveis} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
