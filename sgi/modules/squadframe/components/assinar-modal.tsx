"use client";

import { useState, useEffect } from "react";
import { Button } from "@/ui/components/Button";
import { Spinner } from "@/ui/components/Spinner";

function formatarDataHora(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function AssinarModal({
  acao,
  onConfirm,
  onCancel,
}: {
  acao: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [texto, setTexto] = useState<string | null | "loading">("loading");
  const [confirmando, setConfirmando] = useState(false);
  const [agora] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/assinatura")
      .then((r) => r.json())
      .then((d) => setTexto(d.texto ?? null))
      .catch(() => setTexto(null));
  }, []);

  async function handleConfirm() {
    if (!texto || texto === "loading") return;
    setConfirmando(true);
    try { await onConfirm(); }
    finally { setConfirmando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">

        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="text-primary">
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-text">Assinar e confirmar</h2>
            <p className="mt-0.5 text-sm text-text-2">{acao}</p>
          </div>
        </div>

        {/* Carimbo */}
        <div className="mt-4">
          {texto === "loading" && (
            <div className="flex h-20 items-center justify-center">
              <Spinner size="sm" className="text-primary" />
            </div>
          )}

          {texto && texto !== "loading" && (
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4">
              <div className="text-center">
                <p className="font-mono text-base font-bold uppercase tracking-widest text-primary">
                  {texto}
                </p>
                <p className="mt-1 font-mono text-xs text-primary/60">
                  {formatarDataHora(agora)}
                </p>
              </div>
            </div>
          )}

          {texto === null && (
            <div className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-bg">
              <p className="text-sm text-text-3">Nenhuma assinatura cadastrada.</p>
              <a href="/squadframe/perfil" className="text-xs text-primary underline">
                Criar no perfil →
              </a>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-text-3">
          Data e hora serão registradas junto com esta ação.
        </p>

        <div className="mt-5 flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!texto || texto === "loading" || confirmando}
            className="flex-1"
          >
            {confirmando ? "Processando…" : "Assinar e confirmar"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={confirmando}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
