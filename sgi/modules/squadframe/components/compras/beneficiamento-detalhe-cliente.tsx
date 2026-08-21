"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  marcarEnviado, cancelarBeneficiamento, alterarStatusBeneficiamento,
  registrarValorFinalBeneficiamento, aprovarDebitoBeneficiamento, rejeitarDebitoBeneficiamento,
} from "@/modules/squadframe/actions/compras/beneficiamentos";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { DebitoCarteiraBanner } from "@/modules/squadframe/components/compras/debito-carteira-banner";
import { ReceberBeneficiamentoCliente } from "@/modules/squadframe/components/compras/receber-beneficiamento-cliente";
import { TRANSICOES, ACAO_LABEL } from "@/modules/squadframe/lib/pedido-ui-constants";
import { Button } from "@/ui/components/Button";
import { parseValorBr } from "@/modules/squadframe/lib/valor";

type PedidoBeneficiamento = {
  id: string;
  status: string;
  usa_carteira: boolean;
  debito_registrado: boolean;
  debito_status: string | null;
  debito_rejeitado_motivo: string | null;
  debito_decidido_em: string | null;
  debito_aprovador_nome: string | null;
  valor_final: number | null;
};

type ItemRecebimento = {
  id: string; descricao: string; unidade: string;
  quantidade: number; quantidadeRecebida: number; saldoPendente: number;
};

export function BeneficiamentoDetalheCliente({
  beneficiamentoId, status, podeGerenciar,
  pedidoBeneficiamentoId, pedidoBeneficiamento, itensParaRecebimento, podeAprovar,
}: {
  beneficiamentoId: string;
  status: string;
  podeGerenciar: boolean;
  pedidoBeneficiamentoId?: string | null;
  pedidoBeneficiamento?: PedidoBeneficiamento | null;
  itensParaRecebimento?: ItemRecebimento[];
  podeAprovar?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [pendingDebito, startDebito] = useTransition();
  const [erroDebito, setErroDebito] = useState<string | null>(null);
  const [okDebito, setOkDebito] = useState(false);
  const [showRejeitarDebito, setShowRejeitarDebito] = useState(false);
  const [motivoRejeicaoDebito, setMotivoRejeicaoDebito] = useState("");

  const [pendingTransicao, startTransicao] = useTransition();
  const [erroTransicao, setErroTransicao] = useState<string | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const [acaoConfirmar, setAcaoConfirmar] = useState<{ status: string; obs: string } | null>(null);
  const [showObs, setShowObs] = useState(false);
  const [obsInput, setObsInput] = useState("");

  const [showValorFinal, setShowValorFinal] = useState(false);
  const [valorFinalInput, setValorFinalInput] = useState("");
  const [pendingVF, startVF] = useTransition();
  const [erroVF, setErroVF] = useState<string | null>(null);

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

  function handleAcaoTransicao(novoStatus: string) {
    if (["CANCELADO", "REJEITADO", "RASCUNHO"].includes(novoStatus)) {
      setAcaoConfirmar({ status: novoStatus, obs: "" });
      setShowObs(true);
      return;
    }
    pedirAssinatura(novoStatus, "");
  }

  function pedirAssinatura(novoStatus: string, obs: string) {
    setModalAcao(ACAO_LABEL[novoStatus] ?? novoStatus);
    setAcaoConfirmar({ status: novoStatus, obs });
  }

  function confirmarTransicao() {
    if (!pedidoBeneficiamentoId || !acaoConfirmar) return;
    setModalAcao(null);
    startTransicao(async () => {
      try {
        await alterarStatusBeneficiamento(pedidoBeneficiamentoId, acaoConfirmar.status, acaoConfirmar.obs || undefined);
        setShowObs(false); setObsInput(""); setAcaoConfirmar(null);
        router.refresh();
      } catch (e: any) {
        setErroTransicao(e.message);
      }
    });
  }

  function handleAprovarDebito() {
    if (!pedidoBeneficiamentoId) return;
    setErroDebito(null);
    setOkDebito(false);
    startDebito(async () => {
      try {
        await aprovarDebitoBeneficiamento(pedidoBeneficiamentoId);
        setOkDebito(true);
        router.refresh();
      } catch (e: any) {
        setErroDebito(e.message);
      }
    });
  }

  function handleRejeitarDebito() {
    if (!pedidoBeneficiamentoId) return;
    if (!motivoRejeicaoDebito.trim()) { setErroDebito("Informe o motivo da rejeição."); return; }
    setErroDebito(null);
    startDebito(async () => {
      try {
        await rejeitarDebitoBeneficiamento(pedidoBeneficiamentoId, motivoRejeicaoDebito.trim());
        setShowRejeitarDebito(false);
        setMotivoRejeicaoDebito("");
        router.refresh();
      } catch (e: any) {
        setErroDebito(e.message);
      }
    });
  }

  function salvarValorFinal() {
    if (!pedidoBeneficiamentoId) return;
    const v = parseValorBr(valorFinalInput);
    if (isNaN(v) || v <= 0) { setErroVF("Insira um valor válido."); return; }
    setErroVF(null);
    startVF(async () => {
      try {
        await registrarValorFinalBeneficiamento(pedidoBeneficiamentoId, v);
        setShowValorFinal(false);
        router.refresh();
      } catch (e: any) {
        setErroVF(e.message);
      }
    });
  }

  const pb = pedidoBeneficiamento;
  const STATUS_POS_EMISSAO = ["AGUARDANDO_RECEBIMENTO", "EMITIDO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];
  const temDebitoPendente = !!pb && pb.usa_carteira && !pb.debito_registrado && pb.debito_status == null && STATUS_POS_EMISSAO.includes(pb.status);
  const debitoRejeitado = !!pb && pb.usa_carteira && pb.debito_status === "REJEITADO";
  const debitoAprovado  = !!pb && pb.usa_carteira && pb.debito_status === "APROVADO";
  const statusPermiteValorFinal = !!pb && ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"].includes(pb.status);
  const transicoes = (pb ? (TRANSICOES[pb.status] ?? []) : []).filter((t) => {
    if (t.status === "FINALIZADO" && pb?.valor_final == null) return false;
    if (t.status === "APROVADO" || t.status === "REJEITADO") return !!podeAprovar;
    return podeGerenciar;
  });
  const podeReceber = !!pb && ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(pb.status) && (itensParaRecebimento?.length ?? 0) > 0;

  return (
    <div className="mt-6 space-y-4">
      {pedidoBeneficiamentoId && pb && (
        <>
          <DebitoCarteiraBanner
            temDebitoPendente={temDebitoPendente}
            debitoRejeitado={debitoRejeitado}
            debitoAprovado={debitoAprovado}
            debitoRejeitadoMotivo={pb.debito_rejeitado_motivo}
            debitoAprovadorNome={pb.debito_aprovador_nome}
            debitoDecididoEm={pb.debito_decidido_em}
            pending={pendingDebito}
            erro={erroDebito}
            ok={okDebito}
            showRejeitar={showRejeitarDebito}
            motivoRejeicao={motivoRejeicaoDebito}
            onMotivoRejeicaoChange={setMotivoRejeicaoDebito}
            onAprovar={handleAprovarDebito}
            onRejeitar={handleRejeitarDebito}
            onToggleRejeitar={(show) => { setShowRejeitarDebito(show); if (!show) { setMotivoRejeicaoDebito(""); setErroDebito(null); } }}
          />

          {modalAcao && (
            <AssinarModal
              acao={modalAcao}
              onConfirm={async () => confirmarTransicao()}
              onCancel={() => { setModalAcao(null); setAcaoConfirmar(null); }}
            />
          )}

          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">Status do pedido de beneficiamento</p>
              {statusPermiteValorFinal && (
                showValorFinal ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={valorFinalInput}
                      onChange={(e) => setValorFinalInput(e.target.value)}
                      placeholder="R$ 0,00"
                      className="field h-8 w-32 text-xs"
                    />
                    <Button size="sm" disabled={pendingVF} onClick={salvarValorFinal}>
                      {pendingVF ? "Salvando…" : "Salvar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowValorFinal(false); setErroVF(null); }}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowValorFinal(true)}>
                    {pb.valor_final != null
                      ? `Valor final: ${pb.valor_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                      : "Registrar valor final"}
                  </Button>
                )
              )}
            </div>
            {erroVF && <p className="text-xs text-danger">{erroVF}</p>}

            {showObs && acaoConfirmar ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  placeholder="Observações (opcional)"
                  className="field h-9 flex-1 min-w-[220px] text-sm"
                />
                <Button size="sm" disabled={pendingTransicao} onClick={() => pedirAssinatura(acaoConfirmar.status, obsInput)}>
                  Continuar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowObs(false); setAcaoConfirmar(null); setObsInput(""); }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {transicoes.map((t) => (
                  <button
                    key={t.status}
                    disabled={pendingTransicao}
                    onClick={() => handleAcaoTransicao(t.status)}
                    className={
                      t.variant === "primary" ? "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50" :
                      t.variant === "danger"  ? "inline-flex items-center justify-center rounded-lg border border-red-200 bg-surface px-4 py-2 text-sm font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-danger dark:hover:bg-red-900/20 disabled:opacity-50" :
                      "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-2 hover:bg-bg disabled:opacity-50"
                    }
                  >
                    {t.label}
                  </button>
                ))}
                {transicoes.length === 0 && <p className="text-xs text-text-3">Nenhuma ação disponível neste status.</p>}
              </div>
            )}
            {erroTransicao && <p className="text-xs text-danger">{erroTransicao}</p>}
          </div>

          {podeReceber && itensParaRecebimento && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-text">Registrar recebimento</h2>
              <ReceberBeneficiamentoCliente pedidoBeneficiamentoId={pedidoBeneficiamentoId} itens={itensParaRecebimento} />
            </div>
          )}
        </>
      )}

      {podeGerenciar && status === "AGUARDANDO_ENVIO" && (
        <div className="card p-4 space-y-3">
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
      )}
    </div>
  );
}
