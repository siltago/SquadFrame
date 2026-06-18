"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { alterarStatusSolicitacao } from "@/app/compras/actions";
import { AssinarModal } from "@/components/assinar-modal";

type Transicao = { label: string; status: string; variant: "primary" | "ghost" | "danger" };

const TRANSICOES: Record<string, Transicao[]> = {
  ABERTA:               [{ label: "Enviar para aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADA", variant: "danger" }],
  AGUARDANDO_APROVACAO: [{ label: "Aprovar", status: "APROVADA", variant: "primary" }, { label: "Rejeitar", status: "REJEITADA", variant: "danger" }],
  APROVADA:             [],
  REJEITADA:            [{ label: "Reabrir", status: "ABERTA", variant: "ghost" }],
  CANCELADA:            [],
};

const ACAO_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Enviar para Aprovação",
  APROVADA: "Aprovar Solicitação",
  REJEITADA: "Rejeitar Solicitação",
  CANCELADA: "Cancelar Solicitação",
  ABERTA: "Reabrir Solicitação",
};

export function SolicitacaoCliente({ solicitacao }: { solicitacao: any }) {
  const [obs, setObs] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const router = useRouter();

  const transicoes = TRANSICOES[solicitacao.status] ?? [];

  function handleAcao(status: string) {
    if (status === "CANCELADA" || status === "REJEITADA") {
      setAcaoPendente(status);
      setShowObs(true);
      return;
    }
    pedirAssinatura(status, "");
  }

  function pedirAssinatura(status: string, observacoes: string) {
    pendingFn.current = async () => {
      start(async () => {
        try {
          await alterarStatusSolicitacao(solicitacao.id, status, observacoes || undefined);
          router.refresh();
          setShowObs(false); setObs(""); setAcaoPendente(null);
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao(ACAO_LABEL[status] ?? status);
  }

  if (!transicoes.length) return null;

  return (
    <>
      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}

      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {transicoes.map((t) => (
            <button key={t.status} disabled={pending}
              onClick={() => handleAcao(t.status)}
              className={
                t.variant === "primary" ? "btn-primary" :
                t.variant === "danger"  ? "inline-flex items-center justify-center rounded-card border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50" :
                "btn-ghost"
              }>
              {t.label}
            </button>
          ))}
        </div>

        {showObs && (
          <div className="w-72 rounded-lg border border-line bg-surface p-3 shadow-sm">
            <label className="label">Observação <span className="text-ink-faint font-normal">(opcional)</span></label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="field text-sm" />
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setShowObs(false); pedirAssinatura(acaoPendente!, obs); }}
                className="btn-primary flex-1 text-xs">
                Continuar
              </button>
              <button onClick={() => { setShowObs(false); setAcaoPendente(null); }} className="btn-ghost text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    </>
  );
}
