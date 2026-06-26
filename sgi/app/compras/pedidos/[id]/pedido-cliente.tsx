"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alterarStatusPedido } from "@/app/compras/actions";
import { AssinarModal } from "@/components/assinar-modal";
import { usePode } from "@/components/user-provider";

type Transicao = { label: string; status: string; variant: "primary" | "ghost" | "danger" };

const TRANSICOES: Record<string, Transicao[]> = {
  RASCUNHO:             [{ label: "Enviar aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  AGUARDANDO_APROVACAO: [{ label: "Aprovar", status: "APROVADO", variant: "primary" }, { label: "Rejeitar", status: "CANCELADO", variant: "danger" }],
  APROVADO:             [{ label: "Emitir pedido", status: "EMITIDO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  EMITIDO:              [{ label: "Aguardar recebimento", status: "AGUARDANDO_RECEBIMENTO", variant: "ghost" }],
  AGUARDANDO_RECEBIMENTO: [],
  RECEBIDO_PARCIAL:     [],
  RECEBIDO:             [{ label: "Finalizar", status: "FINALIZADO", variant: "primary" }],
  FINALIZADO:           [],
  CANCELADO:            [],
};

const ACAO_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Enviar para Aprovação",
  APROVADO: "Aprovar Pedido de Compra",
  EMITIDO: "Emitir Pedido de Compra",
  AGUARDANDO_RECEBIMENTO: "Marcar como Aguardando Recebimento",
  FINALIZADO: "Finalizar Pedido",
  CANCELADO: "Cancelar Pedido",
};

export function PedidoCliente({ pedido }: { pedido: any }) {
  const podeCriar    = usePode("compras.pedido.criar");
  const podeAprovar  = usePode("compras.pedido.aprovar");
  const podeCancelar = usePode("compras.pedido.cancelar");
  const [obs, setObs] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const router = useRouter();

  const podeEditarAgora = podeCriar && ["RASCUNHO", "AGUARDANDO_APROVACAO"].includes(pedido.status);
  const transicoes = (TRANSICOES[pedido.status] ?? []).filter((t) => {
    if (t.status === "APROVADO")  return podeAprovar;
    if (t.status === "CANCELADO") return podeCancelar;
    return podeCriar;
  });

  function handleAcao(status: string) {
    if (status === "CANCELADO") { setAcaoPendente(status); setShowObs(true); return; }
    pedirAssinatura(status, "");
  }

  function pedirAssinatura(status: string, observacoes: string) {
    pendingFn.current = async () => {
      start(async () => {
        try {
          await alterarStatusPedido(pedido.id, status, observacoes || undefined);
          router.refresh();
          setShowObs(false); setObs(""); setAcaoPendente(null);
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao(ACAO_LABEL[status] ?? status);
  }

  if (!transicoes.length && !podeEditarAgora) return null;

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
          {podeEditarAgora && (
            <Link href={`/compras/pedidos/${pedido.id}/editar`} className="btn-ghost">
              Editar
            </Link>
          )}
          {transicoes.map((t) => (
            <button key={t.status} disabled={pending} onClick={() => handleAcao(t.status)}
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
            <label className="label">Motivo <span className="text-ink-faint font-normal">(opcional)</span></label>
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
