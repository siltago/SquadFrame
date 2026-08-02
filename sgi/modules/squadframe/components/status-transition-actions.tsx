"use client";

import { useState, useTransition, useRef, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { Button } from "@/ui/components/Button";
import { Textarea } from "@/ui/components/Input";

export type Transicao = { label: string; status: string; variant: "primary" | "ghost" | "danger" };
export type ExtraExecucao = { observacoes?: string; prazoEntrega?: string };

export type StatusTransitionHandle = {
  // Dispara a mesma confirmação (AssinarModal → onExecutar) usada pelo fluxo
  // normal de clique, mas a partir de um passo extra que o próprio
  // consumidor colocou no meio do caminho (ex: prompt de prazo de entrega
  // do Pedido) — ver onClickStatus abaixo.
  executar: (status: string, extra?: ExtraExecucao) => void;
};

// Bloco de botões de transição de status (Enviar aprovação/Aprovar/
// Rejeitar/Cancelar/etc.), compartilhado entre Solicitação e Pedido — os
// dois únicos consumidores com o mesmo formato de TRANSICOES/ACAO_LABEL e
// o mesmo fluxo (clique → opcionalmente observação → AssinarModal →
// onExecutar). Devolução e retorno de pedido NÃO usam este componente:
// têm fluxo/layout genuinamente diferentes (ver auditoria do refactor).
export const StatusTransitionActions = forwardRef<StatusTransitionHandle, {
  transicoes: Transicao[];
  acaoLabel: Record<string, string>;
  onExecutar: (status: string, extra?: ExtraExecucao) => Promise<void>;
  // Quais status pedem um textarea de observação antes do AssinarModal.
  precisaObservacao?: (status: string) => boolean;
  // Deixa o consumidor interceptar um clique específico (ex: Pedido abrindo
  // seu próprio prompt de prazo antes de confirmar "Emitir pedido"). Se
  // retornar true, este componente não faz mais nada com o clique — cabe
  // ao consumidor chamar `ref.executar(status, extra)` quando terminar.
  onClickStatus?: (status: string) => boolean;
}>(function StatusTransitionActions(
  { transicoes, acaoLabel, onExecutar, precisaObservacao, onClickStatus },
  ref,
) {
  const [obs, setObs] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const router = useRouter();

  function dispararAssinatura(status: string, extra?: ExtraExecucao) {
    pendingFn.current = async () => {
      start(async () => {
        try {
          await onExecutar(status, extra);
          router.refresh();
          setShowObs(false); setObs(""); setAcaoPendente(null);
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao(acaoLabel[status] ?? status);
  }

  useImperativeHandle(ref, () => ({
    executar: (status, extra) => dispararAssinatura(status, extra),
  }));

  function handleAcao(status: string) {
    if (onClickStatus?.(status)) return;
    if (precisaObservacao?.(status)) {
      setAcaoPendente(status); setShowObs(true); return;
    }
    dispararAssinatura(status);
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
        <div className="flex flex-wrap gap-2 justify-end">
          {transicoes.map((t) => (
            <button key={t.status} disabled={pending} onClick={() => handleAcao(t.status)}
              className={
                t.variant === "primary" ? "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50" :
                t.variant === "danger"  ? "inline-flex items-center justify-center rounded-lg border border-red-200 bg-surface px-4 py-2 text-sm font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-danger dark:hover:bg-red-900/20 disabled:opacity-50" :
                "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-2 hover:bg-bg disabled:opacity-50"
              }>
              {t.label}
            </button>
          ))}
        </div>

        {showObs && (
          <div className="w-72 rounded-lg border border-border bg-surface p-3 shadow-sm">
            <label className="label">Observação <span className="text-text-3 font-normal">(opcional)</span></label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="text-sm" />
            <div className="mt-2 flex gap-2">
              <Button onClick={() => { setShowObs(false); dispararAssinatura(acaoPendente!, { observacoes: obs }); }}
                className="flex-1 text-xs">
                Continuar
              </Button>
              <Button variant="ghost" onClick={() => { setShowObs(false); setAcaoPendente(null); }} className="text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-danger">{erro}</p>}
      </div>
    </>
  );
});
