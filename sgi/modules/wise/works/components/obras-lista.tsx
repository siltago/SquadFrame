"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { arquivarObraAction } from "@/modules/wise/works/actions";
import type { WiseObra } from "@/modules/wise/works/types";

const STATUS_DOT: Record<string, string> = {
  default: "bg-slate-400",
};

function StatusBadge({ status }: { status: WiseObra["status"] }) {
  if (!status) return null;
  const cor = status.cor ?? "#94a3b8";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cor}20`, color: cor }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
      {status.nome}
    </span>
  );
}

function ObraCard({ obra }: { obra: WiseObra }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleArquivar() {
    if (!confirm(`Arquivar "${obra.nome}"? Ela não aparecerá mais na lista.`)) return;
    start(async () => {
      await arquivarObraAction(obra.id);
      router.refresh();
    });
  }

  return (
    <tr className={`border-b border-border last:border-0 transition-colors hover:bg-bg ${pending ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <Link href={`/squadwise/obras/${obra.id}`}
          className="font-mono text-xs font-medium text-primary hover:underline">
          {obra.codigo ?? "—"}
        </Link>
      </td>
      <td className="px-4 py-3">
        <Link href={`/squadwise/obras/${obra.id}`}
          className="font-medium text-sm hover:text-primary hover:underline">
          {obra.nome}
        </Link>
        {(obra.cidade || obra.estado) && (
          <p className="text-xs text-text-3 mt-0.5">
            {[obra.cidade, obra.estado].filter(Boolean).join(" / ")}
          </p>
        )}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell text-sm text-text-2">
        {(obra.cliente as any)?.nome ?? "—"}
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <StatusBadge status={obra.status} />
      </td>
      <td className="hidden px-4 py-3 lg:table-cell text-sm text-text-2">
        {obra.data_prevista
          ? new Date(obra.data_prevista + "T00:00:00").toLocaleDateString("pt-BR")
          : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/squadwise/obras/${obra.id}`}
            className="rounded p-1.5 text-text-3 hover:bg-surface hover:text-text" title="Ver obra">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </Link>
          <button onClick={handleArquivar} disabled={pending}
            className="rounded p-1.5 text-text-3 hover:bg-danger-soft hover:text-danger disabled:opacity-40" title="Arquivar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ObrasLista({ obras }: { obras: WiseObra[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = busca.trim()
    ? obras.filter((o) =>
        o.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (o.codigo ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        ((o.cliente as any)?.nome ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : obras;

  return (
    <div className="mt-6 space-y-4">
      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código ou cliente…"
            className="field pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-sm text-text-3">{filtradas.length} obra(s)</span>
      </div>

      {filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-text-3">
            {busca ? "Nenhuma obra encontrada para esta busca." : "Nenhuma obra cadastrada ainda."}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-4 py-2.5 font-medium w-28">Código</th>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Cliente</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Status</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Prazo</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((obra) => (
                <ObraCard key={obra.id} obra={obra} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
