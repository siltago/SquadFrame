"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarEnviado, cancelarBeneficiamento } from "@/modules/squadframe/actions/compras/beneficiamentos";
import { Button } from "@/ui/components/Button";

export function BeneficiamentoDetalheCliente({
  beneficiamentoId, status, podeGerenciar,
}: {
  beneficiamentoId: string; status: string; podeGerenciar: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [motivo, setMotivo] = useState("");

  if (!podeGerenciar || status !== "AGUARDANDO_ENVIO") return null;

  function handleEnviar() {
    setErro(null);
    startTransition(async () => {
      try {
        await marcarEnviado(beneficiamentoId);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Não foi possível marcar como enviado.");
      }
    });
  }

  function handleCancelar() {
    if (!motivo.trim()) { setErro("Informe o motivo do cancelamento."); return; }
    setErro(null);
    startTransition(async () => {
      try {
        await cancelarBeneficiamento(beneficiamentoId, motivo);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Não foi possível cancelar.");
      }
    });
  }

  return (
    <div className="mt-6 card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleEnviar} disabled={isPending}>
          {isPending ? "Marcando…" : "Marcar como enviado"}
        </Button>
        {!mostrarCancelar ? (
          <Button variant="ghost" onClick={() => setMostrarCancelar(true)} disabled={isPending}>
            Cancelar beneficiamento
          </Button>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do cancelamento"
              className="field h-9 text-sm flex-1"
            />
            <Button variant="danger" onClick={handleCancelar} disabled={isPending}>
              {isPending ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
            <button type="button" onClick={() => { setMostrarCancelar(false); setMotivo(""); }} className="text-xs text-text-3 hover:text-text">
              Voltar
            </button>
          </div>
        )}
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}
