"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import {
  adiarPendenciasParaAmanha,
  obterUrlUploadEvidencia,
  solicitarProrrogacaoOuExcecao,
  decidirExcecaoPendencia,
  type ExcecaoPendente,
} from "@/app/squadframe/compras/actions";
import { PENDENCIA_LABEL, type Pendencia } from "@/modules/squadframe/services/pendencias/types";
import { calcularSeveridade, MOTIVO_PENDENCIA_LABEL, type NivelSeveridade } from "@/modules/squadframe/services/pendencias/constantes";

function rotaPedido(pedidoId: string): string {
  return `/squadframe/compras/pedidos/${pedidoId}`;
}

const SEVERIDADE_ESTILO: Record<NivelSeveridade, string> = {
  NORMAL: "text-text-3",
  ATENCAO: "text-amber-700 dark:text-amber-400",
  BLOQUEIO_CRIACAO: "text-orange-700 dark:text-orange-400",
  BLOQUEIO_EMISSAO: "text-danger",
};

const SEVERIDADE_LABEL: Record<NivelSeveridade, string> = {
  NORMAL: "",
  ATENCAO: "Atenção",
  BLOQUEIO_CRIACAO: "Bloqueia criar/enviar pedido",
  BLOQUEIO_EMISSAO: "Bloqueia emitir — escalado ao gestor",
};

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function ItemPendencia({
  pendencia,
  colegas,
  onHandled,
}: {
  pendencia: Pendencia;
  colegas: { id: string; nome: string }[];
  onHandled: () => void;
}) {
  const [motivoPadrao, setMotivoPadrao] = useState("FORNECEDOR_ATRASOU");
  const [motivoDetalhe, setMotivoDetalhe] = useState("");
  const [novaData, setNovaData] = useState(amanha());
  const [responsavelId, setResponsavelId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ viradaExcecao: boolean } | null>(null);

  const nivel = calcularSeveridade(pendencia.diasEmAberto, pendencia.tipo === "PRAZO_VENCIDO");

  function enviar() {
    if (motivoPadrao === "OUTRO" && !motivoDetalhe.trim()) { setErro("Descreva o motivo."); return; }
    if (!responsavelId) { setErro("Selecione o responsável pela próxima ação."); return; }
    setErro(null);
    start(async () => {
      try {
        let evidenciaUrl: string | undefined;
        if (arquivo) {
          const { token, caminho } = await obterUrlUploadEvidencia(pendencia.pedidoId, arquivo.name);
          const supabase = createClient();
          const { error: upErr } = await supabase.storage.from("pedido-docs").uploadToSignedUrl(caminho, token, arquivo);
          if (upErr) throw new Error(upErr.message);
          evidenciaUrl = caminho;
        }
        const r = await solicitarProrrogacaoOuExcecao({
          pedidoId: pendencia.pedidoId,
          tipoPendencia: pendencia.tipo,
          motivoPadrao,
          motivoDetalhe: motivoDetalhe.trim() || undefined,
          novaDataCompromisso: novaData,
          responsavelId,
          evidenciaUrl,
        });
        setResultado(r);
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  if (resultado) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-text">Pedido {pendencia.numero}</p>
        {resultado.viradaExcecao ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Enviado para aprovação do seu gestor — você já usou sua prorrogação sozinho neste item,
            não pode adiar de novo sem aprovação.
          </p>
        ) : (
          <p className="mt-1 text-xs text-success">
            Prorrogado até {new Date(`${novaData}T00:00:00`).toLocaleDateString("pt-BR")}. Se o pedido
            continuar parado depois disso, o bloqueio volta sozinho.
          </p>
        )}
        <button onClick={onHandled} className="mt-2 text-xs text-primary underline">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            Pedido {pendencia.numero}
            {pendencia.fornecedorNome && <span className="font-normal text-text-2"> — {pendencia.fornecedorNome}</span>}
          </p>
          <p className={`mt-0.5 text-xs ${SEVERIDADE_ESTILO[nivel]}`}>
            {PENDENCIA_LABEL[pendencia.tipo]} · aberto há {pendencia.diasEmAberto} dia{pendencia.diasEmAberto === 1 ? "" : "s"}
            {SEVERIDADE_LABEL[nivel] && <span className="ml-1.5 font-semibold">· {SEVERIDADE_LABEL[nivel]}</span>}
          </p>
        </div>
        <Link
          href={rotaPedido(pendencia.pedidoId)}
          onClick={onHandled}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg"
        >
          Ir para o pedido →
        </Link>
      </div>

      {pendencia.ultimoMotivo && (
        <p className="mt-2 rounded-md bg-bg px-2.5 py-1.5 text-xs text-text-3">
          Motivo anterior: "{pendencia.ultimoMotivo}"
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-text-3">Motivo</label>
          <select
            value={motivoPadrao}
            onChange={(e) => setMotivoPadrao(e.target.value)}
            className="field h-8 w-full text-xs"
          >
            {Object.entries(MOTIVO_PENDENCIA_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-3">Nova data de compromisso</label>
          <input
            type="date"
            value={novaData}
            min={amanha()}
            onChange={(e) => setNovaData(e.target.value)}
            className="field h-8 w-full text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-text-3">Responsável pela próxima ação</label>
          <select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className="field h-8 w-full text-xs"
          >
            <option value="">Selecione…</option>
            {colegas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-3">Evidência (opcional)</label>
          <input
            type="file"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="field h-8 w-full text-xs file:mr-2 file:text-xs"
          />
        </div>
        {motivoPadrao === "OUTRO" && (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-3">Descreva o motivo</label>
            <input
              type="text"
              value={motivoDetalhe}
              onChange={(e) => setMotivoDetalhe(e.target.value)}
              placeholder="Explique o que está acontecendo…"
              className="field h-8 w-full text-xs"
            />
          </div>
        )}
      </div>

      <div className="mt-3">
        <button
          disabled={pending}
          onClick={enviar}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Prorrogar / solicitar exceção"}
        </button>
      </div>
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
    </div>
  );
}

function ItemExcecaoPendente({ excecao, onDecidido }: { excecao: ExcecaoPendente; onDecidido: () => void }) {
  const [pending, start] = useTransition();
  const [motivoDecisao, setMotivoDecisao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function decidir(aprovar: boolean) {
    setErro(null);
    start(async () => {
      try {
        await decidirExcecaoPendencia(excecao.id, aprovar, motivoDecisao.trim() || undefined);
        onDecidido();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <p className="text-sm font-semibold text-text">
        Pedido {excecao.pedidoNumero} — {excecao.solicitadoPorNome}
      </p>
      <p className="mt-0.5 text-xs text-text-2">
        {PENDENCIA_LABEL[excecao.tipoPendencia as keyof typeof PENDENCIA_LABEL] ?? excecao.tipoPendencia} ·{" "}
        {MOTIVO_PENDENCIA_LABEL[excecao.motivoPadrao] ?? excecao.motivoPadrao}
        {excecao.motivoDetalhe && ` — "${excecao.motivoDetalhe}"`}
      </p>
      <p className="mt-0.5 text-xs text-text-2">
        Pede prazo até {new Date(`${excecao.novaDataCompromisso}T00:00:00`).toLocaleDateString("pt-BR")}
      </p>
      <input
        type="text"
        value={motivoDecisao}
        onChange={(e) => setMotivoDecisao(e.target.value)}
        placeholder="Motivo da decisão (opcional)"
        className="field mt-2 h-8 w-full text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={pending}
          onClick={() => decidir(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          Aprovar
        </button>
        <button
          disabled={pending}
          onClick={() => decidir(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg disabled:opacity-50"
        >
          Rejeitar
        </button>
      </div>
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
    </div>
  );
}

export function PendenciasGate({
  pendenciasIniciais,
  colegas,
  excecoesPendentesIniciais,
}: {
  pendenciasIniciais: Pendencia[];
  colegas: { id: string; nome: string }[];
  excecoesPendentesIniciais: ExcecaoPendente[];
}) {
  const [pendentes, setPendentes] = useState(pendenciasIniciais);
  const [excecoes, setExcecoes] = useState(excecoesPendentesIniciais);
  const [minimizado, setMinimizado] = useState(false);
  const [adiando, startAdiar] = useTransition();
  const router = useRouter();

  if (pendentes.length === 0 && excecoes.length === 0) return null;

  function removerPendencia(chave: string) {
    setPendentes((prev) => prev.filter((p) => `${p.pedidoId}:${p.tipo}` !== chave));
  }

  function removerExcecao(id: string) {
    setExcecoes((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  function minimizar() {
    startAdiar(async () => {
      await adiarPendenciasParaAmanha();
      setMinimizado(true);
    });
  }

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-lg hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
      >
        {pendentes.length} pendência{pendentes.length === 1 ? "" : "s"} adiada{pendentes.length === 1 ? "" : "s"} pra amanhã
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-bg p-6 shadow-2xl">
        {pendentes.length > 0 && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Pendências de compras</p>
                <h2 className="mt-1 text-xl font-bold text-text">
                  Você tem {pendentes.length} pendência{pendentes.length === 1 ? "" : "s"} em aberto
                </h2>
              </div>
              <button
                onClick={minimizar}
                disabled={adiando}
                title="Minimizar e cobrar de novo amanhã"
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg disabled:opacity-50"
              >
                {adiando ? "Adiando…" : "Lembrar amanhã"}
              </button>
            </div>
            <p className="mt-1.5 text-sm text-text-2">
              Resolva no pedido, ou prorrogue com uma nova data de compromisso — passado esse
              limite sem resolução, a criação de pedidos novos é bloqueada até você corrigir.
            </p>

            <div className="mt-5 space-y-3">
              {pendentes.map((p) => (
                <ItemPendencia
                  key={`${p.pedidoId}:${p.tipo}`}
                  pendencia={p}
                  colegas={colegas}
                  onHandled={() => removerPendencia(`${p.pedidoId}:${p.tipo}`)}
                />
              ))}
            </div>
          </>
        )}

        {excecoes.length > 0 && (
          <div className={pendentes.length > 0 ? "mt-8 border-t border-border pt-6" : ""}>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Aprovação pendente</p>
            <h2 className="mt-1 text-xl font-bold text-text">
              {excecoes.length} exceção{excecoes.length === 1 ? "" : "ões"} da sua equipe aguardando decisão
            </h2>
            <div className="mt-5 space-y-3">
              {excecoes.map((e) => (
                <ItemExcecaoPendente key={e.id} excecao={e} onDecidido={() => removerExcecao(e.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
