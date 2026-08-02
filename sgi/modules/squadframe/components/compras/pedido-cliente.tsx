"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alterarStatusPedido, registrarValorFinal, extrairValorFinalDaDevolutiva, confirmarValorFinalComDevolutiva, aprovarDebitoPedido, rejeitarDebitoPedido, atualizarPrazoEntrega } from "@/app/squadframe/compras/actions";
import type { ResultadoExtracaoValorFinal } from "@/modules/squadframe/lib/extrair-valor-pdf";
import { recalcularPrecoKgPerfisAction } from "@/modules/squadstock/actions/catalogo/actions";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { Button } from "@/ui/components/Button";
import { DataInputBr } from "@/modules/squadframe/components/ui/data-input-br";
import { parseValorBr } from "@/modules/squadframe/lib/valor";
import { Textarea } from "@/ui/components/Input";
import { LoadingOverlay } from "@/ui/components/LoadingOverlay";
import { useLoadingOverlay } from "@/ui/lib/use-loading-overlay";

type Transicao = { label: string; status: string; variant: "primary" | "ghost" | "danger" };

const TRANSICOES: Record<string, Transicao[]> = {
  RASCUNHO:               [{ label: "Enviar aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  AGUARDANDO_APROVACAO:   [{ label: "Aprovar", status: "APROVADO", variant: "primary" }, { label: "Rejeitar", status: "REJEITADO", variant: "danger" }],
  REJEITADO:              [{ label: "Devolver para edição", status: "RASCUNHO", variant: "primary" }, { label: "Cancelar pedido", status: "CANCELADO", variant: "danger" }],
  APROVADO:               [{ label: "Emitir pedido", status: "AGUARDANDO_RECEBIMENTO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  EMITIDO:                [{ label: "Emitir pedido", status: "AGUARDANDO_RECEBIMENTO", variant: "primary" }],
  AGUARDANDO_RECEBIMENTO: [],
  RECEBIDO_PARCIAL:       [],
  RECEBIDO:               [{ label: "Finalizar", status: "FINALIZADO", variant: "primary" }],
  FINALIZADO:             [],
  CANCELADO:              [],
};

const ACAO_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Enviar para Aprovação",
  APROVADO: "Aprovar Pedido de Compra",
  REJEITADO: "Rejeitar Pedido",
  RASCUNHO: "Devolver para Edição",
  EMITIDO: "Emitir Pedido de Compra",
  AGUARDANDO_RECEBIMENTO: "Marcar como Aguardando Recebimento",
  FINALIZADO: "Finalizar Pedido",
  CANCELADO: "Cancelar Pedido",
};

export function PedidoCliente({
  pedido,
  hasRecebimentos = false,
}: {
  pedido: any;
  hasRecebimentos?: boolean;
}) {
  const podeCriar    = usePode("compras.pedido.criar");
  const podeAprovar  = usePode("compras.pedido.aprovar");
  const podeCancelar = usePode("compras.pedido.cancelar");
  const podeRetornar = usePode("compras.pedido.retornar");
  const podeDevolver = usePode("compras.pedido.devolver");
  const podeBeneficiar = usePode("compras.beneficiamento.criar");
  const [obs, setObs] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  const [showPrazo, setShowPrazo] = useState(false);
  const [prazoInput, setPrazoInput] = useState(pedido.prazo_entrega ?? "");
  const [erroPrazo, setErroPrazo] = useState<string | null>(null);
  // Edição de prazo depois que o pedido já está Aguardando Recebimento —
  // fluxo separado do prompt de prazo na emissão (showPrazo/prazoInput acima).
  const [showPrazoEdicao, setShowPrazoEdicao] = useState(false);
  const [prazoEdicaoInput, setPrazoEdicaoInput] = useState(pedido.prazo_entrega ?? "");
  const [pendingPrazoEdicao, startPrazoEdicao] = useTransition();
  const [erroPrazoEdicao, setErroPrazoEdicao] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const [showValorFinal, setShowValorFinal] = useState(false);
  // Primária: subir o PDF da devolutiva e deixar o sistema achar o valor.
  // "manual" fica como opção secundária pra quando o PDF não tem um valor
  // reconhecível (layout muito fora do padrão) ou o comprador só quer digitar.
  const [modoValorFinal, setModoValorFinal] = useState<"pdf" | "manual">("pdf");
  const [valorFinalInput, setValorFinalInput] = useState(
    pedido.valor_final != null ? String(pedido.valor_final) : ""
  );
  const [arquivoDevolutiva, setArquivoDevolutiva] = useState<File | null>(null);
  const [extraindo, startExtracao] = useTransition();
  const [resultadoExtracao, setResultadoExtracao] = useState<ResultadoExtracaoValorFinal | null>(null);
  const [erroExtracao, setErroExtracao] = useState<string | null>(null);
  const [valorConfirmadoInput, setValorConfirmadoInput] = useState("");
  const [pendingVF, startVF] = useTransition();
  const [erroVF, setErroVF] = useState<string | null>(null);
  const [showConfirmarPrecoKg, setShowConfirmarPrecoKg] = useState(false);
  const [pendingPrecoKg, startPrecoKg] = useTransition();
  const [resultadoPrecoKg, setResultadoPrecoKg] = useState<string | null>(null);
  const [pendingDebito, startDebito] = useTransition();
  const [erroDebito, setErroDebito] = useState<string | null>(null);
  const [okDebito, setOkDebito] = useState(false);
  const [showRejeitarDebito, setShowRejeitarDebito] = useState(false);
  const [motivoRejeicaoDebito, setMotivoRejeicaoDebito] = useState("");
  const router = useRouter();
  const { status: overlayStatus, run: runComOverlay } = useLoadingOverlay();

  const podeEditarAgora = podeCriar && ["RASCUNHO", "AGUARDANDO_APROVACAO", "REJEITADO"].includes(pedido.status);

  const temRetornoPendente = !!(pedido as any).retorno_pendente_id;
  const STATUS_RETORNAVEL  = ["APROVADO", "EMITIDO", "AGUARDANDO_RECEBIMENTO"];
  const podeAbrirRetorno   = podeRetornar && STATUS_RETORNAVEL.includes(pedido.status) && !hasRecebimentos && !temRetornoPendente;
  const podeAbrirDevolucao = podeDevolver && hasRecebimentos;

  // Beneficiamento (perfil natural mandado pintar) — só depois do pedido
  // emitido (não faz sentido mandar beneficiar algo que ainda pode ser
  // rejeitado/alterado na aprovação). A tela de criação filtra sozinha se
  // o pedido não tem nenhum item de perfil cor natural.
  const STATUS_BENEFICIAVEL = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO"];
  const podeGerarBeneficiamento = podeBeneficiar && STATUS_BENEFICIAVEL.includes(pedido.status);

  // Débito de faturamento direto: três estados possíveis enquanto usa_carteira.
  // Nunca é automático — sempre exige aprovar ou rejeitar explicitamente
  // (ver aprovarDebitoPedido/rejeitarDebitoPedido).
  const STATUS_POS_EMISSAO = ["AGUARDANDO_RECEBIMENTO", "EMITIDO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];
  const temDebitoPendente =
    pedido.usa_carteira &&
    !pedido.debito_registrado &&
    pedido.debito_status == null &&
    STATUS_POS_EMISSAO.includes(pedido.status);
  const debitoRejeitado = pedido.usa_carteira && pedido.debito_status === "REJEITADO";
  const debitoAprovado  = pedido.usa_carteira && pedido.debito_status === "APROVADO";

  function handleAprovarDebito() {
    setErroDebito(null);
    setOkDebito(false);
    startDebito(async () => {
      try {
        await aprovarDebitoPedido(pedido.id);
        setOkDebito(true);
        router.refresh();
      } catch (e: any) {
        setErroDebito(e.message);
      }
    });
  }

  function handleRejeitarDebito() {
    if (!motivoRejeicaoDebito.trim()) { setErroDebito("Informe o motivo da rejeição."); return; }
    setErroDebito(null);
    startDebito(async () => {
      try {
        await rejeitarDebitoPedido(pedido.id, motivoRejeicaoDebito.trim());
        setShowRejeitarDebito(false);
        setMotivoRejeicaoDebito("");
        router.refresh();
      } catch (e: any) {
        setErroDebito(e.message);
      }
    });
  }
  const transicoes = temRetornoPendente ? [] : (TRANSICOES[pedido.status] ?? []).filter((t) => {
    if (t.status === "FINALIZADO" && pedido.valor_final == null) return false;
    if (t.status === "APROVADO")  return podeAprovar;
    // A partir de REJEITADO, aprovador e comprador podem devolver ou cancelar
    if (pedido.status === "REJEITADO") return podeAprovar || podeCriar || (t.status === "CANCELADO" && podeCancelar);
    if (t.status === "CANCELADO") return podeCancelar;
    return podeCriar;
  });

  function handleAcao(status: string) {
    if (["CANCELADO", "REJEITADO", "RASCUNHO"].includes(status)) {
      setAcaoPendente(status); setShowObs(true); return;
    }
    if (status === "AGUARDANDO_RECEBIMENTO" && !pedido.prazo_entrega) {
      setAcaoPendente(status); setErroPrazo(null); setShowPrazo(true); return;
    }
    pedirAssinatura(status, "");
  }

  function pedirAssinatura(status: string, observacoes: string, prazoEntrega?: string) {
    pendingFn.current = async () => {
      start(async () => {
        try {
          await runComOverlay(() => alterarStatusPedido(pedido.id, status, observacoes || undefined, prazoEntrega || undefined));
          router.refresh();
          setShowObs(false); setObs(""); setAcaoPendente(null);
          setShowPrazo(false);
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao(ACAO_LABEL[status] ?? status);
  }

  function confirmarPrazo() {
    if (!prazoInput) { setErroPrazo("Informe o prazo de entrega."); return; }
    setErroPrazo(null);
    pedirAssinatura(acaoPendente!, "", prazoInput);
  }

  // Prazo de entrega pode mudar depois do pedido já emitido (fornecedor
  // atrasa/antecipa) — sem status transition envolvida, só o campo mesmo.
  const podeEditarPrazoEntrega = podeCriar && pedido.status === "AGUARDANDO_RECEBIMENTO";

  function salvarPrazoEdicao() {
    if (!prazoEdicaoInput) { setErroPrazoEdicao("Informe o prazo de entrega."); return; }
    setErroPrazoEdicao(null);
    startPrazoEdicao(async () => {
      try {
        await atualizarPrazoEntrega(pedido.id, prazoEdicaoInput);
        setShowPrazoEdicao(false);
        router.refresh();
      } catch (e: any) { setErroPrazoEdicao(e.message); }
    });
  }

  const podeRegistrarRecebimento =
    podeCriar && ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(pedido.status);

  // Todo pedido emitido precisa poder ter o valor final salvo — com ou sem
  // faturamento direto/carteira — então acompanha os mesmos status aceitos
  // pela action registrarValorFinal, não só "aguardando recebimento".
  const statusPermiteValorFinal = ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"].includes(pedido.status);
  const podeRegistrarValorFinal = podeCriar && statusPermiteValorFinal;

  const ehPedidoDePerfil = (pedido.tipo_linha ?? "").toUpperCase().includes("PERFIL");

  function aposSalvarValorFinal() {
    setShowValorFinal(false);
    router.refresh();
    // Só pedidos de perfil têm peso por item — o preço/kg médio (janela
    // rolante de 60 dias) só faz sentido pra eles (mesma regra da
    // distribuição por peso).
    if (ehPedidoDePerfil) { setResultadoPrecoKg(null); setShowConfirmarPrecoKg(true); }
  }

  function salvarValorFinal() {
    const v = parseValorBr(valorFinalInput);
    if (isNaN(v) || v <= 0) { setErroVF("Insira um valor válido."); return; }
    setErroVF(null);
    startVF(async () => {
      try {
        await registrarValorFinal(pedido.id, v);
        aposSalvarValorFinal();
      } catch (e: any) { setErroVF(e.message); }
    });
  }

  function extrairValorDaDevolutiva() {
    if (!arquivoDevolutiva) { setErroExtracao("Selecione o PDF da devolutiva."); return; }
    setErroExtracao(null);
    startExtracao(async () => {
      try {
        const fd = new FormData();
        fd.set("arquivo", arquivoDevolutiva);
        const resultado = await extrairValorFinalDaDevolutiva(pedido.id, fd);
        setResultadoExtracao(resultado);
        setValorConfirmadoInput(
          resultado.melhorCandidato != null
            ? resultado.melhorCandidato.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : ""
        );
      } catch (e: any) { setErroExtracao(e.message); }
    });
  }

  function confirmarValorDaDevolutiva() {
    const v = parseValorBr(valorConfirmadoInput);
    if (isNaN(v) || v <= 0) { setErroVF("Insira um valor válido."); return; }
    if (!arquivoDevolutiva) { setErroVF("Selecione o PDF novamente."); return; }
    setErroVF(null);
    startVF(async () => {
      try {
        const fd = new FormData();
        fd.set("arquivo", arquivoDevolutiva);
        await confirmarValorFinalComDevolutiva(pedido.id, v, fd);
        aposSalvarValorFinal();
      } catch (e: any) { setErroVF(e.message); }
    });
  }

  function handleRecalcularPrecoKg(sim: boolean) {
    if (!sim) { setShowConfirmarPrecoKg(false); return; }
    startPrecoKg(async () => {
      try {
        const resultado = await recalcularPrecoKgPerfisAction();
        setResultadoPrecoKg(
          resultado
            ? `Preço/kg médio atualizado para ${resultado.mediaKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — ${resultado.produtosAtualizados} produto(s) e ${resultado.aliasesAtualizados} alias(es) de perfil atualizado(s), com base em ${resultado.pedidosConsiderados} pedido(s) dos últimos 60 dias.`
            : "Nenhum pedido de perfil com valor final e peso conhecido nos últimos 60 dias — nada foi atualizado."
        );
      } catch (e: any) {
        setResultadoPrecoKg(`Erro ao recalcular: ${e.message}`);
      }
    });
  }

  if (!transicoes.length && !podeEditarAgora && !podeRegistrarRecebimento && !podeRegistrarValorFinal && !podeEditarPrazoEntrega && !podeAbrirRetorno && !podeAbrirDevolucao && !podeGerarBeneficiamento) return null;

  return (
    <>
      {overlayStatus && (
        <LoadingOverlay status={overlayStatus} label={overlayStatus === "loading" ? "Enviando…" : "Feito!"} />
      )}

      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}

      {/* Banner de débito de faturamento direto — pendente de aprovação */}
      {temDebitoPendente && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-warning-soft p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Débito pendente de aprovação
              </p>
              <p className="mt-0.5 text-xs text-warning dark:text-amber-400">
                Este pedido usa faturamento direto e precisa que alguém aprove o débito na carteira
                {" "}(ou rejeite, se não houver saldo/autorização).
              </p>
              {erroDebito && <p className="mt-1 text-xs text-danger">{erroDebito}</p>}
              {okDebito && <p className="mt-1 text-xs text-success">Débito aprovado com sucesso.</p>}
              {showRejeitarDebito && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={motivoRejeicaoDebito}
                    onChange={(e) => setMotivoRejeicaoDebito(e.target.value)}
                    placeholder="Motivo da rejeição"
                    className="field h-8 min-w-[220px] flex-1 text-xs"
                  />
                  <Button size="sm" variant="danger" disabled={pendingDebito} onClick={handleRejeitarDebito}>
                    {pendingDebito ? "Enviando…" : "Confirmar rejeição"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowRejeitarDebito(false); setMotivoRejeicaoDebito(""); setErroDebito(null); }}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            {!showRejeitarDebito && (
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={pendingDebito}
                  onClick={() => setShowRejeitarDebito(true)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-surface-2 disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  disabled={pendingDebito}
                  onClick={handleAprovarDebito}
                  className="rounded-lg border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {pendingDebito ? "Aprovando…" : "Aprovar débito"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de débito rejeitado — pedido travado até resolver */}
      {debitoRejeitado && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-danger">Débito de faturamento direto rejeitado</p>
              <p className="mt-0.5 text-xs text-danger/90">
                {pedido.debito_rejeitado_motivo ?? "Sem motivo informado."}
              </p>
              <p className="mt-1 text-xs text-text-3">
                Rejeitado por {(pedido as any).debito_aprovador?.nome ?? "—"}
                {pedido.debito_decidido_em && ` em ${new Date(pedido.debito_decidido_em).toLocaleString("pt-BR")}`}
                {" — "}o pedido não avança até isso ser resolvido.
              </p>
              {erroDebito && <p className="mt-1 text-xs text-danger">{erroDebito}</p>}
              {okDebito && <p className="mt-1 text-xs text-success">Débito aprovado com sucesso.</p>}
            </div>
            <button
              disabled={pendingDebito}
              onClick={handleAprovarDebito}
              className="shrink-0 rounded-lg border border-danger bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-hover disabled:opacity-50"
            >
              {pendingDebito ? "Aprovando…" : "Aprovar mesmo assim"}
            </button>
          </div>
        </div>
      )}

      {/* Nota discreta de débito já aprovado — mesma info do "Autorizado por" do extrato */}
      {debitoAprovado && (
        <p className="mb-3 text-xs text-text-3">
          Débito aprovado por <span className="font-medium text-text-2">{(pedido as any).debito_aprovador?.nome ?? "—"}</span>
          {pedido.debito_decidido_em && ` em ${new Date(pedido.debito_decidido_em).toLocaleString("pt-BR")}`}.
        </p>
      )}

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap gap-2 justify-end">
          {podeEditarAgora && !temRetornoPendente && (
            <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedido.id}/editar`}>
              Editar
            </Button>
          )}
          {podeAbrirRetorno && (
            <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedido.id}/retornar`}>
              Retornar pedido
            </Button>
          )}
          {podeAbrirDevolucao && (
            <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedido.id}/devolver`}>
              Criar devolução
            </Button>
          )}
          {podeGerarBeneficiamento && (
            <Button as="a" variant="ghost" href={`/squadframe/beneficiamento/novo?pedido_id=${pedido.id}`}>
              Gerar beneficiamento
            </Button>
          )}
          {podeRegistrarValorFinal && (
            <button
              onClick={() => setShowValorFinal((v) => !v)}
              className={`inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-2 hover:bg-bg flex items-center gap-1.5 ${pedido.valor_final != null ? "text-success border-green-200 bg-green-50 hover:bg-green-100" : ""}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              {pedido.valor_final != null
                ? `Valor final: ${Number(pedido.valor_final).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                : "Adicionar valor final"}
            </button>
          )}
          {podeEditarPrazoEntrega && (
            <button
              onClick={() => setShowPrazoEdicao((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-2 hover:bg-bg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {pedido.prazo_entrega
                ? `Prazo: ${new Date(`${pedido.prazo_entrega}T00:00:00`).toLocaleDateString("pt-BR")}`
                : "Definir prazo de entrega"}
            </button>
          )}
          {podeRegistrarRecebimento && (
            <Button as="a" href={`/squadframe/compras/pedidos/${pedido.id}/receber`}>
              Registrar recebimento
            </Button>
          )}
          {pedido.status === "RECEBIDO" && pedido.valor_final == null && (
            <p className="text-xs text-text-3 self-center">
              Registre o valor final para poder finalizar o pedido.
            </p>
          )}
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

        {showValorFinal && (
          <div className="w-96 rounded-xl border border-border bg-surface p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-text">Valor final do pedido</p>
              <button
                onClick={() => { setShowValorFinal(false); setErroVF(null); }}
                className="text-text-3 hover:text-text"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-2 mb-3">
              Informe o valor real confirmado com o fornecedor. Esse valor será usado no controle financeiro.
            </p>

            {modoValorFinal === "pdf" ? (
              <>
                <label className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-xs font-medium text-text-2 hover:bg-border/40">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="truncate">{arquivoDevolutiva ? arquivoDevolutiva.name : "Escolher arquivo PDF"}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      setArquivoDevolutiva(e.target.files?.[0] ?? null);
                      setResultadoExtracao(null);
                      setErroExtracao(null);
                    }}
                    className="hidden"
                  />
                </label>

                {!resultadoExtracao && (
                  <Button
                    onClick={extrairValorDaDevolutiva}
                    disabled={extraindo || !arquivoDevolutiva}
                    className="mt-3 h-9 w-full text-sm"
                  >
                    {extraindo ? "Lendo PDF…" : "Extrair valor do PDF"}
                  </Button>
                )}

                {erroExtracao && <p className="mt-2 text-xs text-danger">{erroExtracao}</p>}

                {resultadoExtracao && (
                  <div className="mt-3">
                    {resultadoExtracao.melhorCandidato ? (
                      <p className="mb-2 text-xs text-text-2">
                        Valor encontrado perto de <span className="italic">"{resultadoExtracao.melhorCandidato.linha}"</span>. Confira e confirme:
                      </p>
                    ) : (
                      <p className="mb-2 text-xs text-warning">
                        Não encontrei um valor claro no PDF — digite o valor abaixo.
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-2 shrink-0">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorConfirmadoInput}
                        onChange={(e) => setValorConfirmadoInput(e.target.value)}
                        placeholder="0,00"
                        className="field h-9 flex-1 text-sm font-mono"
                        onKeyDown={(e) => e.key === "Enter" && confirmarValorDaDevolutiva()}
                        autoFocus
                      />
                      <Button onClick={confirmarValorDaDevolutiva} disabled={pendingVF} className="h-9 px-3 text-sm shrink-0">
                        {pendingVF ? "…" : "Confirmar e salvar"}
                      </Button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setModoValorFinal("manual"); setErroVF(null); }}
                  className="mt-3 text-xs text-text-3 underline hover:text-text"
                >
                  ou digitar o valor manualmente
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-2 shrink-0">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorFinalInput}
                    onChange={(e) => setValorFinalInput(e.target.value)}
                    placeholder="0,00"
                    className="field h-9 flex-1 text-sm font-mono"
                    onKeyDown={(e) => e.key === "Enter" && salvarValorFinal()}
                    autoFocus
                  />
                  <Button onClick={salvarValorFinal} disabled={pendingVF} className="h-9 px-3 text-sm shrink-0">
                    {pendingVF ? "…" : "Salvar"}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => { setModoValorFinal("pdf"); setErroVF(null); }}
                  className="mt-3 text-xs text-text-3 underline hover:text-text"
                >
                  ou enviar a devolutiva em PDF
                </button>
              </>
            )}

            {erroVF && <p className="mt-2 text-xs text-danger">{erroVF}</p>}
          </div>
        )}

        {showPrazoEdicao && (
          <div className="w-72 rounded-xl border border-border bg-surface p-4 shadow-lg">
            <p className="text-sm font-semibold text-text mb-1">Prazo de entrega</p>
            <p className="text-xs text-text-2 mb-3">
              Ajuste se o fornecedor mudou a data combinada.
            </p>
            <div className="flex items-center gap-2">
              <DataInputBr
                value={prazoEdicaoInput}
                onChange={setPrazoEdicaoInput}
                className="field h-9 flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && salvarPrazoEdicao()}
                autoFocus
              />
              <Button onClick={salvarPrazoEdicao} disabled={pendingPrazoEdicao} className="h-9 px-3 text-sm shrink-0">
                {pendingPrazoEdicao ? "…" : "Salvar"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowPrazoEdicao(false); setErroPrazoEdicao(null); }} className="h-9 px-3 text-sm shrink-0">
                ✕
              </Button>
            </div>
            {erroPrazoEdicao && <p className="mt-2 text-xs text-danger">{erroPrazoEdicao}</p>}
          </div>
        )}

        {showConfirmarPrecoKg && (
          <div className="w-80 rounded-xl border border-border bg-surface p-4 shadow-lg">
            {resultadoPrecoKg == null ? (
              <>
                <p className="text-sm font-semibold text-text mb-1">Atualizar preço/kg dos perfis?</p>
                <p className="text-xs text-text-2 mb-3">
                  Recalcula a média de R$/kg com base nos pedidos de perfil com valor final confirmado
                  nos últimos 60 dias e atualiza o preço de todos os produtos de perfil no catálogo.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => handleRecalcularPrecoKg(true)} disabled={pendingPrecoKg} className="h-9 flex-1 text-sm">
                    {pendingPrecoKg ? "Atualizando…" : "Sim, atualizar"}
                  </Button>
                  <Button variant="ghost" disabled={pendingPrecoKg} onClick={() => handleRecalcularPrecoKg(false)} className="h-9 flex-1 text-sm">
                    Não
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-2">{resultadoPrecoKg}</p>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" onClick={() => setShowConfirmarPrecoKg(false)} className="h-8 px-3 text-xs">
                    Fechar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {showPrazo && (
          <div className="w-72 rounded-lg border border-border bg-surface p-3 shadow-sm">
            <label className="label">Prazo de entrega</label>
            <p className="mb-2 text-xs text-text-3">
              Obrigatório para mover o pedido para Aguardando Recebimento.
            </p>
            <DataInputBr
              value={prazoInput}
              onChange={setPrazoInput}
              className="field text-sm"
              autoFocus
            />
            {erroPrazo && <p className="mt-1 text-xs text-danger">{erroPrazo}</p>}
            <div className="mt-2 flex gap-2">
              <Button onClick={confirmarPrazo} className="flex-1 text-xs">
                Continuar
              </Button>
              <Button variant="ghost" onClick={() => { setShowPrazo(false); setAcaoPendente(null); }} className="text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {showObs && (
          <div className="w-72 rounded-lg border border-border bg-surface p-3 shadow-sm">
            <label className="label">Motivo <span className="text-text-3 font-normal">(opcional)</span></label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="text-sm" />
            <div className="mt-2 flex gap-2">
              <Button onClick={() => { setShowObs(false); pedirAssinatura(acaoPendente!, obs); }}
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
}
