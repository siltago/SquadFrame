"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alterarStatusPedido, registrarValorFinal, confirmarDebitoPedido, atualizarPrazoEntrega } from "@/app/squadframe/compras/actions";
import { recalcularPrecoKgPerfisAction } from "@/modules/squadframe/actions/catalogo/actions";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { Button } from "@/ui/components/Button";
import { DataInputBr } from "@/modules/squadframe/components/ui/data-input-br";

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

export function PedidoCliente({ pedido }: { pedido: any }) {
  const podeCriar    = usePode("compras.pedido.criar");
  const podeAprovar  = usePode("compras.pedido.aprovar");
  const podeCancelar = usePode("compras.pedido.cancelar");
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
  const [valorFinalInput, setValorFinalInput] = useState(
    pedido.valor_final != null ? String(pedido.valor_final) : ""
  );
  const [pendingVF, startVF] = useTransition();
  const [erroVF, setErroVF] = useState<string | null>(null);
  const [showConfirmarPrecoKg, setShowConfirmarPrecoKg] = useState(false);
  const [pendingPrecoKg, startPrecoKg] = useTransition();
  const [resultadoPrecoKg, setResultadoPrecoKg] = useState<string | null>(null);
  const [pendingDebito, startDebito] = useTransition();
  const [erroDebito, setErroDebito] = useState<string | null>(null);
  const [okDebito, setOkDebito] = useState(false);
  const router = useRouter();

  const podeEditarAgora = podeCriar && ["RASCUNHO", "AGUARDANDO_APROVACAO", "REJEITADO"].includes(pedido.status);

  // Débito pendente: pedido emitido com FD mas sem débito registrado (sem carteira ou saldo insuficiente na época)
  const STATUS_POS_EMISSAO = ["AGUARDANDO_RECEBIMENTO", "EMITIDO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];
  const temDebitoPendente =
    pedido.usa_carteira &&
    !pedido.debito_registrado &&
    STATUS_POS_EMISSAO.includes(pedido.status);

  function handleConfirmarDebito() {
    setErroDebito(null);
    setOkDebito(false);
    startDebito(async () => {
      try {
        await confirmarDebitoPedido(pedido.id);
        setOkDebito(true);
        router.refresh();
      } catch (e: any) {
        setErroDebito(e.message);
      }
    });
  }
  const transicoes = (TRANSICOES[pedido.status] ?? []).filter((t) => {
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
          await alterarStatusPedido(pedido.id, status, observacoes || undefined, prazoEntrega || undefined);
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

  function salvarValorFinal() {
    // Aceita formato brasileiro (1.234,56): remove separador de milhar antes
    // de trocar a vírgula decimal por ponto.
    const v = parseFloat(
      valorFinalInput.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")
    );
    if (isNaN(v) || v <= 0) { setErroVF("Insira um valor válido."); return; }
    setErroVF(null);
    startVF(async () => {
      try {
        await registrarValorFinal(pedido.id, v);
        setShowValorFinal(false);
        router.refresh();
        // Só pedidos de perfil têm peso por item — o preço/kg médio do mês
        // só faz sentido pra eles (mesma regra da distribuição por peso).
        if (ehPedidoDePerfil) { setResultadoPrecoKg(null); setShowConfirmarPrecoKg(true); }
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
            ? `Preço/kg médio atualizado para ${resultado.mediaKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — ${resultado.produtosAtualizados} produto(s) de perfil atualizado(s), com base em ${resultado.pedidosConsiderados} pedido(s) do mês.`
            : "Nenhum pedido de perfil com valor final e peso conhecido neste mês — nada foi atualizado."
        );
      } catch (e: any) {
        setResultadoPrecoKg(`Erro ao recalcular: ${e.message}`);
      }
    });
  }

  if (!transicoes.length && !podeEditarAgora && !podeRegistrarRecebimento && !podeRegistrarValorFinal && !podeEditarPrazoEntrega) return null;

  return (
    <>
      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}

      {/* Banner de débito pendente */}
      {temDebitoPendente && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-warning-soft p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Débito pendente na carteira
              </p>
              <p className="mt-0.5 text-xs text-warning dark:text-amber-400">
                Este pedido usa faturamento direto mas o débito ainda não foi registrado.
                {" "}Verifique se há saldo na carteira desta obra/fornecedor e confirme o débito.
              </p>
              {erroDebito && <p className="mt-1 text-xs text-danger">{erroDebito}</p>}
              {okDebito && <p className="mt-1 text-xs text-success">Débito registrado com sucesso.</p>}
            </div>
            <button
              disabled={pendingDebito}
              onClick={handleConfirmarDebito}
              className="shrink-0 rounded-lg border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pendingDebito ? "Debitando…" : "Confirmar débito"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap gap-2 justify-end">
          {podeEditarAgora && (
            <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedido.id}/editar`}>
              Editar
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
          <div className="w-80 rounded-xl border border-border bg-surface p-4 shadow-lg">
            <p className="text-sm font-semibold text-text mb-1">Valor final do pedido</p>
            <p className="text-xs text-text-2 mb-3">
              Informe o valor real confirmado com o fornecedor. Esse valor será usado no controle financeiro.
            </p>
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
              <Button variant="ghost" onClick={() => { setShowValorFinal(false); setErroVF(null); }} className="h-9 px-3 text-sm shrink-0">
                ✕
              </Button>
            </div>
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
                  neste mês e atualiza o preço de todos os produtos de perfil no catálogo.
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
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="field text-sm" />
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
