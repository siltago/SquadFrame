"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { atualizarLoteAction } from "@/modules/wise/works/actions";
import {
  ensureContextoAction,
  adicionarNecessidadeAction,
  cancelarNecessidadeAction,
  bloquearContextoAction,
  desbloquearContextoAction,
  alocarItemPedidoAction,
  cancelarAlocacaoPedidoAction,
  listarItensSolicitacaoDoPacoteAction,
  alocarItemSolicitacaoAction,
  listarRecebimentosDaNecessidadeAction,
  alocarItemRecebimentoAction,
  estornarAlocacaoRecebimentoAction,
} from "@/modules/squadframe/package-procurement/actions";
import type {
  WisePacoteCompras, WiseNecessidade, CoberturaNecessidade,
  PedidoItemDisponivel, StatusSuprimentosCalculado,
  SolicitacaoItemDisponivel, RecebimentoItemDisponivel,
} from "@/modules/squadframe/package-procurement/types";
import type {
  WiseLoteComTipologias,
  WiseTipologia,
  WiseLotePedido,
  WiseLoteSolicitacao,
} from "@/modules/wise/works/types";

// ── Constantes ─────────────────────────────────────────────────────────────

const STATUS_TIP: Record<string, { label: string; cls: string; dot: string; hex: string }> = {
  pendente:    { label: "Pendente",    cls: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",   hex: "#94a3b8" },
  em_producao: { label: "Em produção", cls: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",    hex: "#3b82f6" },
  pronto:      { label: "Pronto",      cls: "bg-green-100 text-green-700",   dot: "bg-green-500",   hex: "#22c55e" },
  entregue:    { label: "Entregue",    cls: "bg-purple-100 text-purple-700", dot: "bg-purple-500",  hex: "#a855f7" },
  cancelado:   { label: "Cancelado",   cls: "bg-red-100 text-red-600",       dot: "bg-red-400",     hex: "#f87171" },
};

const STATUS_ORDER = ["pendente", "em_producao", "pronto", "entregue", "cancelado"] as const;

const ETAPAS = [
  { key: "configuracao", label: "Config."  },
  { key: "compras",      label: "Compras"  },
  { key: "producao",     label: "Produção" },
  { key: "entrega",      label: "Entrega"  },
  { key: "concluido",    label: "Concluído"},
] as const;

type EtapaKey = (typeof ETAPAS)[number]["key"];

const STATUS_PEDIDO: Record<string, { label: string; cls: string }> = {
  RASCUNHO:               { label: "Rascunho",         cls: "bg-slate-100 text-slate-600"    },
  AGUARDANDO_APROVACAO:   { label: "Ag. aprovação",    cls: "bg-amber-100 text-amber-700"    },
  APROVADO:               { label: "Aprovado",         cls: "bg-blue-100 text-blue-700"      },
  REJEITADO:              { label: "Rejeitado",        cls: "bg-red-100 text-red-600"        },
  EMITIDO:                { label: "Emitido",          cls: "bg-indigo-100 text-indigo-700"  },
  AGUARDANDO_RECEBIMENTO: { label: "Ag. recebimento",  cls: "bg-orange-100 text-orange-700"  },
  RECEBIDO_PARCIAL:       { label: "Recebido parcial", cls: "bg-purple-100 text-purple-700"  },
  RECEBIDO:               { label: "Recebido",         cls: "bg-green-100 text-green-700"    },
  FINALIZADO:             { label: "Finalizado",       cls: "bg-emerald-100 text-emerald-700"},
  CANCELADO:              { label: "Cancelado",        cls: "bg-red-50 text-red-400"         },
};

const STATUS_SOL: Record<string, { label: string; cls: string }> = {
  ABERTA:               { label: "Aberta",        cls: "bg-blue-100 text-blue-700"     },
  AGUARDANDO_APROVACAO: { label: "Ag. aprovação", cls: "bg-amber-100 text-amber-700"   },
  APROVADA:             { label: "Aprovada",      cls: "bg-green-100 text-green-700"   },
  REJEITADA:            { label: "Rejeitada",     cls: "bg-red-100 text-red-600"       },
  CANCELADA:            { label: "Cancelada",     cls: "bg-slate-100 text-slate-500"   },
  EM_PEDIDO:            { label: "Em pedido",     cls: "bg-indigo-100 text-indigo-700" },
};

const TIPO_PRODUCAO_OPTS = [
  { value: "",                   label: "Não definido"       },
  { value: "fabricacao_interna", label: "Fabricação Interna" },
  { value: "terceirizado",       label: "Terceirizado"       },
  { value: "misto",              label: "Misto"              },
];

const PRIORIDADE_CLS: Record<string, string> = {
  BAIXA:   "text-slate-500",
  MEDIA:   "text-blue-500",
  ALTA:    "text-orange-500",
  CRITICA: "text-red-600",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function calcArea(t: WiseTipologia) {
  if (!t.largura_mm || !t.altura_mm) return 0;
  return (t.largura_mm / 1000) * (t.altura_mm / 1000) * t.quantidade;
}

function isAtrasado(prazo: string | null) {
  if (!prazo) return false;
  return new Date(prazo) < new Date();
}

function StatusBadge({ cls, label }: { cls: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Pizza SVG ──────────────────────────────────────────────────────────────

function PieChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return (
      <svg width="100" height="100" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="16"
          className="text-border" />
      </svg>
    );
  }

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];
  const R = 48; const cx = 60; const cy = 60;

  for (const sl of slices) {
    if (sl.value === 0) continue;
    const sweep = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({ color: sl.color, d: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z` });
  }

  if (paths.length === 1) {
    return (
      <svg width="100" height="100" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={R} fill={paths[0].color} />
        <circle cx={cx} cy={cy} r={R * 0.45} fill="var(--color-surface, white)" />
      </svg>
    );
  }

  return (
    <svg width="100" height="100" viewBox="0 0 120 120">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
      <circle cx={cx} cy={cy} r={R * 0.45} fill="var(--color-surface, white)" />
    </svg>
  );
}

// ── Linha de tipologia ─────────────────────────────────────────────────────

function TipologiaRow({ t }: { t: WiseTipologia }) {
  const [expandido, setExpandido] = useState(false);
  const st = t.status ? (STATUS_TIP[t.status] ?? null) : null;
  const dims = t.largura_mm && t.altura_mm ? `${t.largura_mm}×${t.altura_mm}` : null;
  const pesoTotal  = t.peso_unit  ? t.peso_unit  * t.quantidade : null;
  const valorTotal = t.preco_unit ? t.preco_unit * t.quantidade : null;
  const area = calcArea(t);

  return (
    <>
      <tr
        className="border-b border-border text-sm cursor-pointer hover:bg-bg/60 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        <td className="pl-4 pr-2 py-3 w-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-3 transition-transform ${expandido ? "rotate-90" : ""}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </td>
        <td className="px-3 py-3 font-medium text-text">{t.tipo || t.nome}</td>
        <td className="px-3 py-3">
          {t.codigo_esquadria
            ? <span className="font-mono text-xs font-semibold text-primary">{t.codigo_esquadria}</span>
            : <span className="text-xs text-text-3">—</span>}
        </td>
        <td className="px-3 py-3 text-xs text-text-2 max-w-[180px] truncate">
          {t.descricao || <span className="text-text-3">—</span>}
        </td>
        <td className="px-3 py-3 text-xs text-text-3 tabular-nums">{dims ?? "—"}</td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums">{t.quantidade}</td>
        <td className="px-3 py-3">
          {t.tratamento
            ? <span className="inline-block rounded-full bg-bg px-2 py-0.5 text-xs text-text-2">{t.tratamento}</span>
            : <span className="text-xs text-text-3">—</span>}
        </td>
        <td className="px-3 py-3 pr-4">
          {st
            ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            : <span className="text-xs text-text-3">—</span>}
        </td>
      </tr>

      {expandido && (
        <tr className="border-b border-border bg-bg/40">
          <td colSpan={8} className="px-8 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 text-sm">
              {([
                ["Peso unit.",  t.peso_unit  != null ? `${fmt(t.peso_unit,  3)} kg` : "—"],
                ["Peso total",  pesoTotal    != null ? `${fmt(pesoTotal,    2)} kg` : "—"],
                ["Área total",  area > 0             ? `${fmt(area,         3)} m²` : "—"],
                ["Preço unit.", t.preco_unit != null ? `R$ ${fmt(t.preco_unit)}` : "—"],
                ["Valor total", valorTotal   != null ? `R$ ${fmt(valorTotal, 0)}` : "—"],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label}>
                  <p className="text-[11px] text-text-3 uppercase tracking-wide">{label}</p>
                  <p className="mt-0.5 font-medium text-text">{val}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Aba: Dashboard ─────────────────────────────────────────────────────────

function TabDashboard({
  lote,
  pedidos,
  solicitacoes,
}: {
  lote: WiseLoteComTipologias;
  pedidos: WiseLotePedido[];
  solicitacoes: WiseLoteSolicitacao[];
}) {
  const etapa = (lote.etapa ?? "configuracao") as EtapaKey;
  const etapaIdx = ETAPAS.findIndex((e) => e.key === etapa);
  const libCompras = lote.liberado_compras ?? false;
  const libProd    = lote.liberado_producao ?? false;

  const pedidosAtrasados = pedidos.filter((p) => isAtrasado(p.prazo_entrega));

  return (
    <div className="space-y-5">
      {/* Etapa + liberações */}
      <div className="card px-5 py-4 space-y-4">
        {/* Stepper de etapa */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3 mb-3">Etapa</p>
          <div className="flex items-center gap-0">
            {ETAPAS.map((e, i) => {
              const isAtual    = i === etapaIdx;
              const isConcluida = i < etapaIdx;
              return (
                <div key={e.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      isAtual     ? "bg-primary scale-125"   :
                      isConcluida ? "bg-primary/40"          :
                                    "bg-border"
                    }`} />
                    <span className={`mt-1.5 text-[10px] font-medium text-center truncate w-full px-0.5 ${
                      isAtual     ? "text-primary"  :
                      isConcluida ? "text-text-2"   :
                                    "text-text-3"
                    }`}>
                      {e.label}
                    </span>
                  </div>
                  {i < ETAPAS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 shrink ${i < etapaIdx ? "bg-primary/40" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liberações */}
        <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            libCompras ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"
          }`}>
            <span className={`h-2 w-2 rounded-full ${libCompras ? "bg-green-500" : "bg-slate-300"}`} />
            Compras {libCompras ? "liberada" : "não liberada"}
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            libProd ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"
          }`}>
            <span className={`h-2 w-2 rounded-full ${libProd ? "bg-blue-500" : "bg-slate-300"}`} />
            Produção {libProd ? "liberada" : "não liberada"}
          </div>
          {lote.tipo_producao && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-2 bg-bg">
              {TIPO_PRODUCAO_OPTS.find((o) => o.value === lote.tipo_producao)?.label ?? lote.tipo_producao}
            </div>
          )}
        </div>
      </div>

      {/* Alertas de atraso */}
      {pedidosAtrasados.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            className="text-red-500 mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">
              {pedidosAtrasados.length === 1 ? "1 pedido atrasado" : `${pedidosAtrasados.length} pedidos atrasados`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {pedidosAtrasados.map((p) => `#${p.numero}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Pedidos */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-3">
          Pedidos de Compra · {pedidos.length}
        </p>
        {pedidos.length === 0 ? (
          <div className="card px-4 py-6 text-center">
            <p className="text-sm text-text-3">Nenhum pedido vinculado.</p>
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {pedidos.map((p) => {
              const st = STATUS_PEDIDO[p.status] ?? { label: p.status, cls: "bg-slate-100 text-slate-600" };
              const atrasado = isAtrasado(p.prazo_entrega);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusBadge cls={st.cls} label={st.label} />
                  <span className="text-sm font-medium text-text flex-1">#{p.numero}</span>
                  {p.prazo_entrega && (
                    <span className={`text-xs tabular-nums ${atrasado ? "text-red-500 font-semibold" : "text-text-3"}`}>
                      {atrasado ? "⚠ " : ""}
                      {new Date(p.prazo_entrega).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solicitações */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-3">
          Solicitações · {solicitacoes.length}
        </p>
        {solicitacoes.length === 0 ? (
          <div className="card px-4 py-6 text-center">
            <p className="text-sm text-text-3">Nenhuma solicitação vinculada.</p>
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {solicitacoes.map((s) => {
              const st = STATUS_SOL[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-600" };
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusBadge cls={st.cls} label={st.label} />
                  <span className="text-sm font-medium text-text flex-1">#{s.numero}</span>
                  <span className="text-xs text-text-3 tabular-nums">
                    {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba: Itens ─────────────────────────────────────────────────────────────

function TabItens({ lote }: { lote: WiseLoteComTipologias }) {
  const porStatus = lote.tipologias.reduce<Record<string, number>>((acc, t) => {
    const s = t.status ?? "pendente";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const pieSlices = STATUS_ORDER
    .filter((k) => (porStatus[k] ?? 0) > 0)
    .map((k) => ({ value: porStatus[k] ?? 0, color: STATUS_TIP[k].hex, label: STATUS_TIP[k].label }));

  const concluidas = (porStatus["pronto"] ?? 0) + (porStatus["entregue"] ?? 0);
  const progresso = lote.tipologias.length > 0
    ? Math.round((concluidas / lote.tipologias.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Gráfico de pizza */}
      <div className="card px-5 py-4 flex items-center gap-6">
        <div className="shrink-0">
          <PieChart slices={pieSlices} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold tabular-nums">{progresso}%</span>
            <span className="text-sm text-text-3">concluído · {lote.tipologias.length} tipologias</span>
          </div>
          <div className="space-y-1.5">
            {STATUS_ORDER.map((k) => {
              const count = porStatus[k] ?? 0;
              if (count === 0) return null;
              const s = STATUS_TIP[k];
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.hex }} />
                  <span className="text-sm text-text-2 flex-1">{s.label}</span>
                  <span className="text-sm font-medium tabular-nums text-text">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabela */}
      {lote.tipologias.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-text-3">Nenhuma tipologia neste lote.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="pl-4 pr-2 py-3 w-6" />
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Código</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium">Dimensão</th>
                <th className="px-3 py-3 font-medium text-right">Qtd</th>
                <th className="px-3 py-3 font-medium">Tratamento</th>
                <th className="px-3 py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {lote.tipologias.map((t) => <TipologiaRow key={t.id} t={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Aba: Liberação ─────────────────────────────────────────────────────────

function TabLiberacao({
  lote,
  obraId,
}: {
  lote: WiseLoteComTipologias;
  obraId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const etapaAtual = (lote.etapa ?? "configuracao") as EtapaKey;
  const etapaIdx = ETAPAS.findIndex((e) => e.key === etapaAtual);

  const [etapa,           setEtapa          ] = useState<EtapaKey>(etapaAtual);
  const [libCompras,      setLibCompras      ] = useState(lote.liberado_compras  ?? false);
  const [libProd,         setLibProd         ] = useState(lote.liberado_producao ?? false);
  const [tipoProducao,    setTipoProducao    ] = useState(lote.tipo_producao     ?? "");

  function salvar() {
    setErro(null);
    setSucesso(false);
    startTransition(async () => {
      const res = await atualizarLoteAction(lote.id, obraId, {
        etapa,
        liberado_compras: libCompras,
        liberado_producao: libProd,
        tipo_producao: tipoProducao || null,
      });
      if (res.ok) setSucesso(true);
      else setErro(res.erro);
    });
  }

  const etapaIdxAtual = ETAPAS.findIndex((e) => e.key === etapa);

  return (
    <div className="space-y-6 max-w-xl">
      {/* Etapa */}
      <div className="card px-5 py-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Etapa do Lote</p>

        {/* Botões de etapa */}
        <div className="flex flex-wrap gap-2">
          {ETAPAS.map((e, i) => (
            <button
              key={e.key}
              type="button"
              onClick={() => setEtapa(e.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
                etapa === e.key
                  ? "bg-primary text-white border-primary"
                  : i < etapaIdxAtual
                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  : "bg-bg text-text-2 border-border hover:bg-bg/80"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Atalhos de transição */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            disabled={etapaIdxAtual === 0 || isPending}
            onClick={() => setEtapa(ETAPAS[etapaIdxAtual - 1].key)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-2 hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </button>
          <button
            type="button"
            disabled={etapaIdxAtual === ETAPAS.length - 1 || isPending}
            onClick={() => setEtapa(ETAPAS[etapaIdxAtual + 1].key)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-2 hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Avançar
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Liberações */}
      <div className="card px-5 py-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Liberações</p>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-text">Liberar para Compras</p>
            <p className="text-xs text-text-3 mt-0.5">Permite criar pedidos e solicitações de compra para este lote</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={libCompras}
            onClick={() => setLibCompras((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
              libCompras ? "bg-green-500" : "bg-border"
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
              libCompras ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </label>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-text">Liberar para Produção</p>
            <p className="text-xs text-text-3 mt-0.5">Permite iniciar ordens de produção para as tipologias deste lote</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={libProd}
            onClick={() => setLibProd((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
              libProd ? "bg-blue-500" : "bg-border"
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
              libProd ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </label>
      </div>

      {/* Tipo de Produção */}
      <div className="card px-5 py-5 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Tipo de Produção</p>
        <div className="flex flex-wrap gap-2">
          {TIPO_PRODUCAO_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setTipoProducao(o.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
                tipoProducao === o.value
                  ? "bg-primary text-white border-primary"
                  : "bg-bg text-text-2 border-border hover:bg-bg/80"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback + salvar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={salvar}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Salvando…" : "Salvar alterações"}
        </button>
        {sucesso && !isPending && (
          <span className="text-sm text-green-600 font-medium">Salvo com sucesso.</span>
        )}
        {erro && !isPending && (
          <span className="text-sm text-red-500">{erro}</span>
        )}
      </div>
    </div>
  );
}

// ── Aba: Compras (necessidades de material) ───────────────────────────────
// Fonte de verdade é o SquadFrame (frame_pacote_compras/frame_pacote_necessidades)
// — esta aba só existe fisicamente aqui porque o Frame ainda não tem uma
// página própria de pacote; a lógica de domínio inteira vive em
// modules/squadframe/package-procurement/.

const CRITICIDADE_CLS: Record<string, string> = {
  BAIXA:      "bg-slate-100 text-slate-600",
  NORMAL:     "bg-blue-100 text-blue-700",
  ALTA:       "bg-orange-100 text-orange-700",
  BLOQUEANTE: "bg-red-100 text-red-600",
};

const ETAPA_NECESSIDADE_OPTS = [
  { value: "",            label: "—"          },
  { value: "corte",       label: "Corte"      },
  { value: "usinagem",    label: "Usinagem"   },
  { value: "montagem",    label: "Montagem"   },
  { value: "vedacao",     label: "Vedação"    },
  { value: "vidro",       label: "Vidro"      },
  { value: "embalagem",   label: "Embalagem"  },
  { value: "expedicao",   label: "Expedição"  },
];

function NovaNecessidadeForm({ pacoteId, onCriada }: { pacoteId: string; onCriada: (n: WiseNecessidade) => void }) {
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("");
  const [criticidade, setCriticidade] = useState("NORMAL");
  const [etapa, setEtapa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await adicionarNecessidadeAction({
        pacote_id: pacoteId,
        descricao_livre: descricao,
        quantidade: parseFloat(quantidade.replace(",", ".")) || 0,
        unidade,
        criticidade,
        etapa_necessaria: etapa || null,
      });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onCriada({
        id: resultado.dados,
        pacote_id: pacoteId,
        produto_id: null,
        descricao_livre: descricao,
        quantidade_necessaria: parseFloat(quantidade.replace(",", ".")) || 0,
        unidade,
        criticidade: criticidade as WiseNecessidade["criticidade"],
        etapa_necessaria: (etapa || null) as WiseNecessidade["etapa_necessaria"],
        estado_administrativo: "ATIVA",
        motivo_cancelamento: null,
        criado_por: null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      });
      setDescricao(""); setQuantidade(""); setUnidade(""); setCriticidade("NORMAL"); setEtapa("");
    });
  }

  return (
    <div className="card px-4 py-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Nova necessidade de material</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <input
          className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2"
          placeholder="Descrição (ex: Perfil montante Suprema)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Quantidade"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Unidade (ex: barra)"
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
        />
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={criticidade}
          onChange={(e) => setCriticidade(e.target.value)}
        >
          <option value="BAIXA">Baixa</option>
          <option value="NORMAL">Normal</option>
          <option value="ALTA">Alta</option>
          <option value="BLOQUEANTE">Bloqueante</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
        >
          {ETAPA_NECESSIDADE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          type="button"
          disabled={isPending || !descricao.trim() || !quantidade.trim() || !unidade.trim()}
          onClick={submeter}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Adicionando…" : "Adicionar"}
        </button>
        {erro && <span className="text-sm text-red-500">{erro}</span>}
      </div>
    </div>
  );
}

const STATUS_SUPRIMENTOS_LABEL: Record<StatusSuprimentosCalculado, string> = {
  SEM_NECESSIDADES:   "Sem necessidades",
  PENDENTE_DE_COMPRA: "Pendente de compra",
  COMPRA_PARCIAL:     "Compra parcial",
  PEDIDOS_EMITIDOS:   "Pedidos emitidos",
  RECEBIMENTO_PARCIAL:"Recebimento parcial",
  MATERIAL_RECEBIDO:  "Material recebido",
};

function AlocarPedidoForm({
  necessidadeId,
  itensDisponiveis,
  onAlocado,
  onFechar,
}: {
  necessidadeId: string;
  itensDisponiveis: PedidoItemDisponivel[];
  onAlocado: () => void;
  onFechar: () => void;
}) {
  const [itemId, setItemId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const itemSelecionado = itensDisponiveis.find((i) => i.id === itemId);
  const saldo = itemSelecionado ? itemSelecionado.quantidade_pedida - itemSelecionado.ja_alocado : 0;

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alocarItemPedidoAction({
        pedido_item_id: itemId,
        necessidade_id: necessidadeId,
        quantidade: parseFloat(quantidade.replace(",", ".")) || 0,
        justificativa,
      });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onAlocado();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg p-3">
      <select
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
      >
        <option value="">Selecione um item de pedido…</option>
        {itensDisponiveis.filter((i) => i.quantidade_pedida - i.ja_alocado > 0).map((i) => (
          <option key={i.id} value={i.id}>
            #{i.pedido_numero} — {i.descricao_snapshot} (saldo: {(i.quantidade_pedida - i.ja_alocado).toFixed(3)} {i.unidade})
          </option>
        ))}
      </select>
      {itemId && (
        <>
          <div className="flex items-center gap-2">
            <input
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder={`Qtd (máx ${saldo.toFixed(3)})`}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            <span className="text-xs text-text-3">{itemSelecionado?.unidade}</span>
          </div>
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Justificativa (compra direta, sem solicitação vinculada)"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending || !quantidade.trim() || !justificativa.trim()}
              onClick={submeter}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Alocando…" : "Confirmar alocação"}
            </button>
            <button type="button" onClick={onFechar} className="text-xs text-text-3 hover:text-text-2">
              Cancelar
            </button>
            {erro && <span className="text-xs text-red-500">{erro}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function AlocarSolicitacaoForm({
  necessidadeId,
  itensDisponiveis,
  onAlocado,
  onFechar,
}: {
  necessidadeId: string;
  itensDisponiveis: SolicitacaoItemDisponivel[];
  onAlocado: () => void;
  onFechar: () => void;
}) {
  const [itemId, setItemId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const itemSelecionado = itensDisponiveis.find((i) => i.id === itemId);
  const saldo = itemSelecionado ? itemSelecionado.quantidade - itemSelecionado.ja_alocado : 0;

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alocarItemSolicitacaoAction({
        solicitacao_item_id: itemId,
        necessidade_id: necessidadeId,
        quantidade: parseFloat(quantidade.replace(",", ".")) || 0,
      });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onAlocado();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg p-3">
      <select
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
      >
        <option value="">Selecione um item de solicitação…</option>
        {itensDisponiveis.filter((i) => i.quantidade - i.ja_alocado > 0).map((i) => (
          <option key={i.id} value={i.id}>
            #{i.solicitacao_numero} — {i.descricao} (saldo: {(i.quantidade - i.ja_alocado).toFixed(3)} {i.unidade})
          </option>
        ))}
      </select>
      {itemId && (
        <>
          <div className="flex items-center gap-2">
            <input
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder={`Qtd (máx ${saldo.toFixed(3)})`}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            <span className="text-xs text-text-3">{itemSelecionado?.unidade}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending || !quantidade.trim()}
              onClick={submeter}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Alocando…" : "Confirmar alocação"}
            </button>
            <button type="button" onClick={onFechar} className="text-xs text-text-3 hover:text-text-2">
              Cancelar
            </button>
            {erro && <span className="text-xs text-red-500">{erro}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function AlocarRecebimentoForm({
  necessidadeId,
  onAlocado,
  onFechar,
}: {
  necessidadeId: string;
  onAlocado: () => void;
  onFechar: () => void;
}) {
  const [itens, setItens] = useState<RecebimentoItemDisponivel[] | null>(null);
  const [itemId, setItemId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listarRecebimentosDaNecessidadeAction(necessidadeId).then(setItens);
  }, [necessidadeId]);

  if (itens === null) {
    return <div className="mt-2 rounded-lg border border-border bg-bg p-3 text-xs text-text-3">Carregando recebimentos…</div>;
  }

  const itemSelecionado = itens.find((i) => i.id === itemId);
  const saldo = itemSelecionado ? itemSelecionado.quantidade_recebida - itemSelecionado.ja_alocado : 0;

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alocarItemRecebimentoAction({
        recebimento_item_id: itemId,
        pedido_item_alocacao_id: itemSelecionado!.pedido_item_alocacao_id,
        quantidade: parseFloat(quantidade.replace(",", ".")) || 0,
      });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onAlocado();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg p-3">
      {itens.length === 0 ? (
        <p className="text-xs text-text-3">Nenhum recebimento disponível — só entram itens de pedidos já alocados a esta necessidade.</p>
      ) : (
        <select
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          <option value="">Selecione um item recebido…</option>
          {itens.filter((i) => i.quantidade_recebida - i.ja_alocado > 0).map((i) => (
            <option key={i.id} value={i.id}>
              #{i.pedido_numero} (saldo: {(i.quantidade_recebida - i.ja_alocado).toFixed(3)} {i.unidade})
            </option>
          ))}
        </select>
      )}
      {itemId && (
        <>
          <div className="flex items-center gap-2">
            <input
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder={`Qtd (máx ${saldo.toFixed(3)})`}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            <span className="text-xs text-text-3">{itemSelecionado?.unidade}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending || !quantidade.trim()}
              onClick={submeter}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Alocando…" : "Confirmar alocação"}
            </button>
            <button type="button" onClick={onFechar} className="text-xs text-text-3 hover:text-text-2">
              Cancelar
            </button>
            {erro && <span className="text-xs text-red-500">{erro}</span>}
          </div>
        </>
      )}
      {!itemId && (
        <button type="button" onClick={onFechar} className="text-xs text-text-3 hover:text-text-2">
          Fechar
        </button>
      )}
    </div>
  );
}

function TabCompras({
  loteId,
  contextoInicial,
  necessidadesIniciais,
  coberturaInicial,
  statusSuprimentos,
  itensPedidoDisponiveis,
  itensSolicitacaoDisponiveis,
}: {
  loteId: string;
  contextoInicial: WisePacoteCompras | null;
  necessidadesIniciais: WiseNecessidade[];
  coberturaInicial: CoberturaNecessidade[];
  statusSuprimentos: StatusSuprimentosCalculado;
  itensPedidoDisponiveis: PedidoItemDisponivel[];
  itensSolicitacaoDisponiveis: SolicitacaoItemDisponivel[];
}) {
  const [contexto, setContexto] = useState(contextoInicial);
  const [necessidades, setNecessidades] = useState(necessidadesIniciais);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [alocandoNecessidadeId, setAlocandoNecessidadeId] = useState<string | null>(null);
  const [modoAlocacao, setModoAlocacao] = useState<"pedido" | "solicitacao" | "recebimento" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);

  const ativas = necessidades.filter((n) => n.estado_administrativo === "ATIVA");
  const coberturaPorNecessidade = new Map(coberturaInicial.map((c) => [c.necessidade_id, c]));

  function preparar() {
    startTransition(async () => {
      const resultado = await ensureContextoAction(loteId);
      if (resultado.ok) {
        setContexto((prev) => prev ?? {
          id: resultado.dados, pacote_id: loteId, responsavel_id: null,
          bloqueado: false, motivo_bloqueio: null, bloqueado_por: null, bloqueado_em: null,
          criado_por: null, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
        });
      }
    });
  }

  function cancelar(necessidadeId: string) {
    const motivo = window.prompt("Motivo do cancelamento:");
    if (!motivo) return;
    startTransition(async () => {
      const resultado = await cancelarNecessidadeAction(necessidadeId, motivo);
      if (resultado.ok) {
        setNecessidades((prev) => prev.map((n) => n.id === necessidadeId
          ? { ...n, estado_administrativo: "CANCELADA", motivo_cancelamento: motivo }
          : n));
      }
    });
  }

  function toggleBloqueio() {
    startTransition(async () => {
      if (contexto?.bloqueado) {
        const resultado = await desbloquearContextoAction(loteId);
        if (resultado.ok) setContexto((prev) => prev && { ...prev, bloqueado: false, motivo_bloqueio: null });
      } else {
        if (!motivoBloqueio.trim()) return;
        const resultado = await bloquearContextoAction(loteId, motivoBloqueio);
        if (resultado.ok) {
          setContexto((prev) => prev && { ...prev, bloqueado: true, motivo_bloqueio: motivoBloqueio });
          setMotivoBloqueio("");
        }
      }
    });
  }

  if (!contexto) {
    return (
      <div className="card px-5 py-8 text-center space-y-3">
        <p className="text-sm text-text-3">Este pacote ainda não tem contexto de Compras.</p>
        <button
          type="button"
          disabled={isPending}
          onClick={preparar}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Preparando…" : "Preparar contexto de Compras"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Situação calculada</p>
          <p className="mt-1 text-lg font-bold text-text">{STATUS_SUPRIMENTOS_LABEL[statusSuprimentos]}</p>
          <p className="text-xs text-text-3 mt-0.5">{ativas.length} necessidade(s) ativa(s)</p>
        </div>
        {contexto.bloqueado ? (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Bloqueado: {contexto.motivo_bloqueio}
            </div>
            <button type="button" disabled={isPending} onClick={toggleBloqueio}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg disabled:opacity-50">
              Desbloquear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Motivo do bloqueio"
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
            />
            <button type="button" disabled={isPending || !motivoBloqueio.trim()} onClick={toggleBloqueio}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg disabled:opacity-50">
              Bloquear
            </button>
          </div>
        )}
      </div>

      <NovaNecessidadeForm pacoteId={loteId} onCriada={(n) => setNecessidades((prev) => [...prev, n])} />

      {precisaAtualizar && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Alocação registrada — recarregue a página pra ver a cobertura atualizada.
        </div>
      )}

      {necessidades.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-text-3">Nenhuma necessidade de material cadastrada.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {necessidades.map((n) => {
            const cob = coberturaPorNecessidade.get(n.id);
            return (
              <div key={n.id} className={`px-4 py-3 ${n.estado_administrativo === "CANCELADA" ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CRITICIDADE_CLS[n.criticidade]}`}>
                    {n.criticidade}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {n.produto?.nome ?? n.descricao_livre}
                    </p>
                    <p className="text-xs text-text-3">
                      {n.quantidade_necessaria} {n.unidade}
                      {n.etapa_necessaria ? ` · ${n.etapa_necessaria}` : ""}
                      {n.estado_administrativo === "CANCELADA" ? ` · cancelada: ${n.motivo_cancelamento}` : ""}
                    </p>
                    {cob && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded bg-bg px-1.5 py-0.5 text-text-3">Solicitado: {cob.solicitado}</span>
                        <span className="rounded bg-bg px-1.5 py-0.5 text-text-3">Pedido: {cob.pedido}</span>
                        <span className="rounded bg-bg px-1.5 py-0.5 text-text-3">Recebido: {cob.recebido}</span>
                      </div>
                    )}
                  </div>
                  {n.estado_administrativo === "ATIVA" && (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAlocandoNecessidadeId((prev) => (prev === n.id && modoAlocacao === "solicitacao" ? null : n.id));
                          setModoAlocacao("solicitacao");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Alocar solicitação
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAlocandoNecessidadeId((prev) => (prev === n.id && modoAlocacao === "pedido" ? null : n.id));
                          setModoAlocacao("pedido");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Alocar pedido
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAlocandoNecessidadeId((prev) => (prev === n.id && modoAlocacao === "recebimento" ? null : n.id));
                          setModoAlocacao("recebimento");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Alocar recebimento
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => cancelar(n.id)}
                        className="text-xs text-text-3 hover:text-red-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
                {alocandoNecessidadeId === n.id && modoAlocacao === "solicitacao" && (
                  <AlocarSolicitacaoForm
                    necessidadeId={n.id}
                    itensDisponiveis={itensSolicitacaoDisponiveis}
                    onFechar={() => setAlocandoNecessidadeId(null)}
                    onAlocado={() => { setAlocandoNecessidadeId(null); setPrecisaAtualizar(true); }}
                  />
                )}
                {alocandoNecessidadeId === n.id && modoAlocacao === "pedido" && (
                  <AlocarPedidoForm
                    necessidadeId={n.id}
                    itensDisponiveis={itensPedidoDisponiveis}
                    onFechar={() => setAlocandoNecessidadeId(null)}
                    onAlocado={() => { setAlocandoNecessidadeId(null); setPrecisaAtualizar(true); }}
                  />
                )}
                {alocandoNecessidadeId === n.id && modoAlocacao === "recebimento" && (
                  <AlocarRecebimentoForm
                    necessidadeId={n.id}
                    onFechar={() => setAlocandoNecessidadeId(null)}
                    onAlocado={() => { setAlocandoNecessidadeId(null); setPrecisaAtualizar(true); }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

interface Props {
  lote: WiseLoteComTipologias;
  obraId: string;
  obraNome: string;
  pedidos: WiseLotePedido[];
  solicitacoes: WiseLoteSolicitacao[];
  contextoCompras: WisePacoteCompras | null;
  necessidades: WiseNecessidade[];
  cobertura: CoberturaNecessidade[];
  statusSuprimentos: StatusSuprimentosCalculado;
  itensPedidoDisponiveis: PedidoItemDisponivel[];
  itensSolicitacaoDisponiveis: SolicitacaoItemDisponivel[];
}

type Aba = "dashboard" | "itens" | "compras" | "liberacao";

const ABAS: { key: Aba; label: string }[] = [
  { key: "dashboard",  label: "Dashboard"  },
  { key: "itens",      label: "Itens"      },
  { key: "compras",    label: "Compras"    },
  { key: "liberacao",  label: "Liberação"  },
];

export function LoteDetalhe({
  lote, obraId, obraNome, pedidos, solicitacoes,
  contextoCompras, necessidades, cobertura, statusSuprimentos, itensPedidoDisponiveis,
  itensSolicitacaoDisponiveis,
}: Props) {
  const [aba, setAba] = useState<Aba>("dashboard");

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-3">
            {obraNome} · Lote
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{lote.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {lote.prioridade && (
              <span className={`text-sm font-medium ${PRIORIDADE_CLS[lote.prioridade] ?? ""}`}>
                {lote.prioridade.charAt(0) + lote.prioridade.slice(1).toLowerCase()}
              </span>
            )}
            <span className="text-sm text-text-3">
              Criado em {new Date(lote.criado_em).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        <Link
          href={`/squadframe/obras/${obraId}?aba=producao`}
          target="_blank"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-2 hover:text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Frame
        </Link>
      </div>

      {/* Abas */}
      <div className="mt-5 flex gap-1 border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAba(a.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aba === a.key
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-2"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="mt-5">
        {aba === "dashboard" && (
          <TabDashboard lote={lote} pedidos={pedidos} solicitacoes={solicitacoes} />
        )}
        {aba === "itens" && <TabItens lote={lote} />}
        {aba === "compras" && (
          <TabCompras
            loteId={lote.id}
            contextoInicial={contextoCompras}
            necessidadesIniciais={necessidades}
            coberturaInicial={cobertura}
            statusSuprimentos={statusSuprimentos}
            itensPedidoDisponiveis={itensPedidoDisponiveis}
            itensSolicitacaoDisponiveis={itensSolicitacaoDisponiveis}
          />
        )}
        {aba === "liberacao" && <TabLiberacao lote={lote} obraId={obraId} />}
      </div>
    </div>
  );
}
