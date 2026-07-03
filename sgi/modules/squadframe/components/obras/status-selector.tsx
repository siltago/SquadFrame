"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarStatusObra, alterarStatusObra } from "@/modules/squadframe/actions/obras/actions";

type StatusObra = { id: string; nome: string; cor: string };

interface Props {
  obraId: string;
  statusAtual: { id: string; nome: string; cor: string };
}

export function StatusObraSelector({ obraId, statusAtual }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusObra[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && status.length === 0) {
      buscarStatusObra().then(setStatus);
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(s: StatusObra) {
    if (s.id === statusAtual.id) { setOpen(false); return; }
    setPendingId(s.id);
    startTransition(async () => {
      await alterarStatusObra(obraId, s.id);
      setOpen(false);
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: statusAtual.cor + "22", color: statusAtual.cor }}
        title="Clique para alterar o status"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusAtual.cor }} />
        {statusAtual.nome}
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[160px] rounded-xl border border-border bg-surface shadow-xl overflow-hidden">
          {status.length === 0 ? (
            <div className="px-4 py-3 text-xs text-text-3">Carregando…</div>
          ) : (
            status.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                disabled={pendingId !== null}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-bg disabled:opacity-50
                  ${s.id === statusAtual.id ? "font-semibold" : "font-normal text-text-2"}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.cor }}
                />
                {s.nome}
                {pendingId === s.id && (
                  <span className="ml-auto h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                )}
                {s.id === statusAtual.id && pendingId === null && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-primary"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
