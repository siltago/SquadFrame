"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { excluirLote, editarTipologia, criarPacoteTrabalho, editarLoteBasico } from "@/modules/squadframe/actions/obras/actions";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { Modal } from "@/ui/components/Modal";
import { Input, Textarea } from "@/ui/components/Input";
import { Badge } from "@/ui/components/Badge";
import { Avatar } from "@/ui/components/Avatar";
import { Tabs, TabList, Tab, TabPanel } from "@/ui/components/Tabs";
import { EmptyState } from "@/ui/components/EmptyState";
import { STATUS_PED_COR, STATUS_PED_LABEL, STATUS_SOL_COR, STATUS_SOL_LABEL } from "@/modules/squadframe/types/compras";

// ── Tipos ─────────────────────────────────────────────────────────

const STATUS_TIP = {
  pendente:    { label: "Pendente",    cor: "#94a3b8" },
  em_producao: { label: "Em produção", cor: "#3b82f6" },
  pronto:      { label: "Pronto",      cor: "#22c55e" },
  entregue:    { label: "Entregue",    cor: "#a855f7" },
  cancelado:   { label: "Cancelado",   cor: "#ef4444" },
} as const;
type StatusKey = keyof typeof STATUS_TIP;

type Tipologia = {
  id: string;
  nome: string;
  quantidade: number;
  status?: string | null;
  codigo_esquadria?: string | null;
  tipo?: string | null;
  largura_mm?: number | null;
  altura_mm?: number | null;
  tratamento?: string | null;
  descricao?: string | null;
  peso_unit?: number | null;
  preco_unit?: number | null;
};

const PRIORIDADE_PACOTE = {
  BAIXA:    { label: "Baixa",    cor: "#94a3b8" },
  MEDIA:    { label: "Média",    cor: "#3b82f6" },
  ALTA:     { label: "Alta",     cor: "#f59e0b" },
  CRITICA:  { label: "Crítica",  cor: "#ef4444" },
} as const;
type PrioridadeKey = keyof typeof PRIORIDADE_PACOTE;

type SolicitacaoResumo = {
  id: string;
  numero: string;
  status: string;
  prioridade: string;
  criado_em: string;
  solicitante?: { nome: string } | null;
};

type PedidoResumo = {
  id: string;
  numero: string;
  status: string;
  criado_em: string;
  valor_final?: number | null;
  valor_itens?: number | null;
  fornecedor?: { nome: string } | null;
  comprador?: { nome: string } | null;
};

// No SquadFrame a UI chama essa entidade de "Lote" (nome que já existia
// antes da tabela lotes_obra virar Pacote de Trabalho no Wise) — mesma
// tabela, só a linguagem muda entre os dois módulos.
type Lote = {
  id: string;
  nome: string;
  criado_em: string;
  descricao?: string | null;
  prioridade?: string | null;
  prazo?: string | null;
  responsavel_id?: string | null;
  responsavel?: { nome: string } | null;
  tipologias: Tipologia[];
  solicitacoes: SolicitacaoResumo[];
  pedidos: PedidoResumo[];
};

// ── Sub-componentes ───────────────────────────────────────────────

function TratamentoBadge({ texto }: { texto: string }) {
  const lower = texto.toLowerCase();
  let cls = "bg-bg text-text-2";
  if (lower.includes("incolor"))                              cls = "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400";
  else if (lower.includes("fume") || lower.includes("fumê")) cls = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  else if (lower.includes("preto"))                          cls = "bg-zinc-800 text-zinc-100";
  else if (lower.includes("pintura"))                        cls = "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{texto}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_TIP[status as StatusKey] ?? { label: status, cor: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: s.cor + "22", color: s.cor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.cor }} />
      {s.label}
    </span>
  );
}

function TipologiaCard({ t, obraId }: { t: Tipologia; obraId: string }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(t);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function f(field: keyof Tipologia, value: any) {
    setDraft((p) => ({ ...p, [field]: value === "" ? null : value }));
  }

  function salvar() {
    startTransition(async () => {
      await editarTipologia(t.id, obraId, {
        nome:             draft.tipo || draft.nome,
        quantidade:       draft.quantidade,
        status:           draft.status || "pendente",
        codigo_esquadria: draft.codigo_esquadria ?? null,
        tipo:             draft.tipo ?? null,
        largura_mm:       draft.largura_mm ?? null,
        altura_mm:        draft.altura_mm ?? null,
        tratamento:       draft.tratamento ?? null,
        descricao:        draft.descricao ?? null,
        peso_unit:        draft.peso_unit ?? null,
        preco_unit:       draft.preco_unit ?? null,
      });
      setEditando(false);
      router.refresh();
    });
  }

  if (editando) {
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-surface p-4 space-y-3">
        {/* Status */}
        <div>
          <label className="label">Status</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {(Object.entries(STATUS_TIP) as [StatusKey, { label: string; cor: string }][]).map(([key, s]) => (
              <button
                key={key}
                type="button"
                onClick={() => f("status", key)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-2 transition-all"
                style={
                  (draft.status || "pendente") === key
                    ? { backgroundColor: s.cor + "22", borderColor: s.cor, color: s.cor }
                    : { backgroundColor: "transparent", borderColor: "#e2e8f0", color: "#94a3b8" }
                }
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.cor }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Tipo / Nome *</label>
            <input autoFocus value={draft.tipo ?? ""} onChange={(e) => f("tipo", e.target.value)} className="field text-sm" />
          </div>
          <div>
            <label className="label">Código (CODESQD)</label>
            <input value={draft.codigo_esquadria ?? ""} onChange={(e) => f("codigo_esquadria", e.target.value)} className="field text-sm font-mono" />
          </div>
          <div>
            <label className="label">Qtde</label>
            <input type="number" min="1" value={draft.quantidade} onChange={(e) => f("quantidade", parseInt(e.target.value) || 1)} className="field text-sm" />
          </div>
          <div>
            <label className="label">Largura (mm)</label>
            <input type="number" value={draft.largura_mm ?? ""} onChange={(e) => f("largura_mm", parseInt(e.target.value))} className="field text-sm" />
          </div>
          <div>
            <label className="label">Altura (mm)</label>
            <input type="number" value={draft.altura_mm ?? ""} onChange={(e) => f("altura_mm", parseInt(e.target.value))} className="field text-sm" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Tratamento</label>
            <input value={draft.tratamento ?? ""} onChange={(e) => f("tratamento", e.target.value)} className="field text-sm" />
          </div>
          <div className="col-span-2">
            <label className="label">Descrição</label>
            <input value={draft.descricao ?? ""} onChange={(e) => f("descricao", e.target.value)} className="field text-sm" />
          </div>
          <div>
            <label className="label">Peso unit (kg)</label>
            <input type="number" step="0.01" value={draft.peso_unit ?? ""} onChange={(e) => f("peso_unit", parseFloat(e.target.value))} className="field text-sm" />
          </div>
          <div>
            <label className="label">Preço unit (R$)</label>
            <input type="number" step="0.01" value={draft.preco_unit ?? ""} onChange={(e) => f("preco_unit", parseFloat(e.target.value))} className="field text-sm" />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={salvar} disabled={pending} size="sm">
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          <Button onClick={() => { setDraft(t); setEditando(false); }} disabled={pending} variant="ghost" size="sm">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex gap-3 p-3 group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setEditando(true)}>
      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-bg px-2.5 py-2 text-center min-w-[60px]">
        {t.largura_mm && t.altura_mm ? (
          <>
            <span className="font-mono text-xs font-bold text-text">{t.largura_mm}</span>
            <span className="font-mono text-[9px] text-text-3 leading-none">×</span>
            <span className="font-mono text-xs font-bold text-text">{t.altura_mm}</span>
            <span className="mt-0.5 text-[9px] text-text-3">mm</span>
          </>
        ) : (
          <span className="text-xs text-text-3">—</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-text">{t.tipo || t.nome}</span>
          {t.codigo_esquadria && <span className="font-mono text-[11px] text-text-3">{t.codigo_esquadria}</span>}
          <StatusBadge status={t.status || "pendente"} />
        </div>
        {t.descricao && <p className="mt-0.5 text-xs text-text-2 leading-snug line-clamp-1">{t.descricao}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-2"><span className="font-semibold text-text">{t.quantidade}</span> {t.quantidade === 1 ? "peça" : "peças"}</span>
          {t.tratamento && <TratamentoBadge texto={t.tratamento} />}
          {t.peso_unit != null && t.peso_unit > 0 && <span className="text-text-3">{t.peso_unit} kg/un</span>}
          {t.preco_unit != null && t.preco_unit > 0 && <span className="font-medium text-text">{t.preco_unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/un</span>}
        </div>
      </div>

      <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-3">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
    </div>
  );
}

// Abas do detalhe do pacote que ainda não têm dado/funcionalidade real —
// existem só como estrutura visual preparada para integrações futuras
// (Compras, Produção de chão de fábrica, SquadBoard). Nenhuma é implementada
// nesta fase.
const ABAS_FUTURAS: { id: string; label: string }[] = [
  { id: "producao",     label: "Produção" },
  { id: "arquivos",     label: "Arquivos" },
  { id: "comentarios",  label: "Comentários" },
  { id: "timeline",     label: "Timeline" },
];

function PacoteCard({ lote, obraId, defaultOpen, onEditar }: { lote: Lote; obraId: string; defaultOpen: boolean; onEditar: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const total = lote.tipologias.length;
  const concluidas = lote.tipologias.filter((t) => t.status === "pronto" || t.status === "entregue").length;
  const totalPeso = lote.tipologias.reduce((s, t) => s + (t.peso_unit ?? 0) * t.quantidade, 0);
  // Valor do lote = soma dos pedidos vinculados a ele — usa o valor final
  // (confirmado pelo fornecedor) quando já registrado; enquanto o pedido
  // não chegou lá, usa o valor dos itens do próprio pedido. Não é mais a
  // estimativa de catálogo das tipologias.
  const totalPreco = lote.pedidos.reduce((s, p) => s + (p.valor_final ?? p.valor_itens ?? 0), 0);
  const data = new Date(lote.criado_em).toLocaleDateString("pt-BR");
  const prioridade = lote.prioridade ? PRIORIDADE_PACOTE[lote.prioridade as PrioridadeKey] : null;
  const prazoAtrasado = !!lote.prazo && new Date(lote.prazo) < new Date() && concluidas < total;

  function handleExcluir() {
    startTransition(async () => {
      await excluirLote(lote.id, obraId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-col gap-1.5 px-4 py-3 bg-bg/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((p) => !p)}
            className="flex flex-1 items-center gap-2 text-left min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-text-3">
              <path d="M20 6H12l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
            </svg>
            <span className="font-medium text-sm text-text truncate">{lote.nome}</span>
            {prioridade && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: prioridade.cor + "22", color: prioridade.cor }}
              >
                {prioridade.label}
              </span>
            )}
            {total > 0 && (
              <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-3">
                {concluidas}/{total}
              </span>
            )}
            <span className="shrink-0 text-xs text-text-3 ml-auto">{data}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-text-3 transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {confirmarExcluir ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="danger" size="sm" onClick={handleExcluir} disabled={pending} className="px-2">
                {pending ? "…" : "Excluir tudo"}
              </Button>
              <button onClick={() => setConfirmarExcluir(false)} className="rounded-md px-2 py-1 text-xs text-text-3 hover:bg-bg">
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEditar(); }}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-bg hover:text-primary transition-colors"
                title="Editar lote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmarExcluir(true); }}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-danger-soft hover:text-danger transition-colors"
                title="Excluir lote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {(lote.descricao || lote.responsavel || lote.prazo || totalPeso > 0 || totalPreco > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[23px] text-xs text-text-3">
            {lote.descricao && <span className="truncate max-w-[320px]">{lote.descricao}</span>}
            {lote.responsavel && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={lote.responsavel.nome} size="xs" />
                {lote.responsavel.nome}
              </span>
            )}
            {lote.prazo && (
              <span className={prazoAtrasado ? "font-medium text-danger" : ""}>
                Prazo: {new Date(lote.prazo).toLocaleDateString("pt-BR")}
              </span>
            )}
            {totalPeso > 0 && <span>{totalPeso.toFixed(1)} kg</span>}
            {totalPreco > 0 && (
              <span className="font-medium text-text">
                {totalPreco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="p-3">
          <Tabs defaultTab="tipologias">
            <TabList variant="underline">
              <Tab id="tipologias">Tipologias</Tab>
              <Tab id="solicitacoes" badge={lote.solicitacoes.length || undefined}>Solicitações</Tab>
              <Tab id="pedidos" badge={lote.pedidos.length || undefined}>Pedidos</Tab>
              {ABAS_FUTURAS.map((a) => <Tab id={a.id} key={a.id}>{a.label}</Tab>)}
            </TabList>

            <TabPanel id="tipologias" className="pt-3 space-y-2">
              {lote.tipologias.length === 0 ? (
                <EmptyState size="sm" title="Nenhuma tipologia neste lote" />
              ) : (
                lote.tipologias.map((t) => <TipologiaCard key={t.id} t={t} obraId={obraId} />)
              )}
            </TabPanel>

            <TabPanel id="solicitacoes" className="pt-3 space-y-2">
              <div className="flex justify-end">
                <Button
                  as="a"
                  href={`/squadframe/compras/solicitacoes/nova?obra_id=${obraId}&lote_id=${lote.id}&origem_contexto=PRODUCAO_PACOTE`}
                  className="text-sm"
                >
                  Nova Solicitação de Compra
                </Button>
              </div>
              {lote.solicitacoes.length === 0 ? (
                <EmptyState size="sm" title="Nenhuma solicitação vinculada a este lote" />
              ) : (
                lote.solicitacoes.map((s) => {
                  const cor   = STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] ?? "#94a3b8";
                  const label = STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL] ?? s.status;
                  return (
                    <Link
                      key={s.id}
                      href={`/squadframe/compras/solicitacoes/${s.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm hover:bg-bg transition-colors"
                    >
                      <span className="font-mono font-bold text-primary">{s.numero}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: cor + "20", color: cor }}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-text-3">{s.prioridade}</span>
                      {s.solicitante?.nome && <span className="text-text-2">{s.solicitante.nome}</span>}
                      <span className="ml-auto shrink-0 text-xs text-text-3">
                        {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </Link>
                  );
                })
              )}
            </TabPanel>

            <TabPanel id="pedidos" className="pt-3 space-y-2">
              <div className="flex justify-end">
                <Button
                  as="a"
                  href={`/squadframe/compras/pedidos/novo?obra_id=${obraId}&lote_id=${lote.id}&origem_contexto=PRODUCAO_PACOTE`}
                  className="text-sm"
                >
                  Novo Pedido de Compra
                </Button>
              </div>
              {lote.pedidos.length === 0 ? (
                <EmptyState size="sm" title="Nenhum pedido vinculado a este lote" />
              ) : (
                lote.pedidos.map((p) => {
                  const cor   = STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] ?? "#94a3b8";
                  const label = STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status;
                  return (
                    <Link
                      key={p.id}
                      href={`/squadframe/compras/pedidos/${p.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm hover:bg-bg transition-colors"
                    >
                      <span className="font-mono font-bold text-primary">{p.numero}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: cor + "20", color: cor }}
                      >
                        {label}
                      </span>
                      {p.fornecedor?.nome && <span className="text-text-2">{p.fornecedor.nome}</span>}
                      {p.valor_final != null && (
                        <span className="font-medium text-text">
                          {p.valor_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-text-3">
                        {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </Link>
                  );
                })
              )}
            </TabPanel>

            {ABAS_FUTURAS.map((a) => (
              <TabPanel id={a.id} key={a.id} className="pt-3">
                <EmptyState size="sm" title={`${a.label} — em breve`} description="Essa seção ainda não está conectada a nenhum módulo." />
              </TabPanel>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

export function AbaProducao({
  obraId,
  lotes,
  semLote,
  migracaoPendente,
}: {
  obraId: string;
  lotes: Lote[];
  semLote: Array<{ id: string; nome: string; quantidade: number }>;
  migracaoPendente?: boolean;
}) {
  const [mostrarFormPacote, setMostrarFormPacote] = useState(false);
  const [loteEditando, setLoteEditando] = useState<Lote | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmitPacote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await criarPacoteTrabalho(obraId, fd);
      setMostrarFormPacote(false);
      router.refresh();
    });
  }

  function handleSubmitEditarLote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loteEditando) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await editarLoteBasico(loteEditando.id, obraId, fd);
      setLoteEditando(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {migracaoPendente && (
        <Alert variant="warning" title="Migração SQL necessária">
          Rode o arquivo{" "}
          <code className="font-mono bg-warning-soft px-1 rounded">supabase/lotes-producao.sql</code>{" "}
          no Supabase SQL Editor para ativar esta aba.
        </Alert>
      )}

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMostrarFormPacote(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-text-2 hover:border-primary hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo lote
        </button>
      </div>

      {lotes.length === 0 && semLote.length === 0 && (
        <div className="card p-10 text-center text-sm text-text-3">
          Nenhum lote criado ainda. Crie um lote pra começar — a importação de
          XML e as tipologias são gerenciadas no Wise.
        </div>
      )}

      {lotes.length > 0 && (
        <div className="space-y-2">
          {lotes.map((lote, i) => (
            <PacoteCard
              key={lote.id}
              lote={lote}
              obraId={obraId}
              defaultOpen={i === lotes.length - 1}
              onEditar={() => setLoteEditando(lote)}
            />
          ))}
        </div>
      )}

      {semLote.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3 px-1">Adicionadas manualmente</p>
          {semLote.map((t) => (
            <div key={t.id} className="card p-3">
              <p className="font-medium text-sm text-text">{t.nome}</p>
              <p className="mt-0.5 text-xs text-text-2">{t.quantidade} {t.quantidade === 1 ? "peça" : "peças"}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={mostrarFormPacote}
        onClose={() => setMostrarFormPacote(false)}
        title="Novo lote"
        size="sm"
      >
        <form onSubmit={handleSubmitPacote} className="flex flex-col gap-4">
          <Input
            label="Nome"
            name="nome"
            required
            placeholder="Ex: Fachada Norte"
          />
          <Textarea
            label="Descrição"
            name="descricao"
            placeholder="Escopo deste lote (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setMostrarFormPacote(false)} disabled={pending} variant="ghost">Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar lote"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={loteEditando !== null}
        onClose={() => setLoteEditando(null)}
        title="Editar lote"
        size="sm"
      >
        <form onSubmit={handleSubmitEditarLote} className="flex flex-col gap-4">
          <Input
            label="Nome"
            name="nome"
            required
            defaultValue={loteEditando?.nome ?? ""}
            placeholder="Ex: Fachada Norte"
          />
          <Textarea
            label="Descrição"
            name="descricao"
            defaultValue={loteEditando?.descricao ?? ""}
            placeholder="Escopo deste lote (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setLoteEditando(null)} disabled={pending} variant="ghost">Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
