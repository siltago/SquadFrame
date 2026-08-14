"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LotePlanejamento } from "@/modules/squadframe/services/planejamento/lotes";
import {
  editarLotePlanejamento,
  alternarLiberacaoComprasPlanejamento,
  buscarPedidosDaObraPlanejamento,
} from "@/modules/squadframe/actions/planejamento/actions";
import { excluirLote } from "@/modules/squadframe/actions/obras/actions";
import { vincularPedidoLote } from "@/app/squadframe/compras/actions";
import { Button } from "@/ui/components/Button";
import { Modal } from "@/ui/components/Modal";
import { Input, Textarea } from "@/ui/components/Input";
import { Tabs, TabList, Tab, TabPanel } from "@/ui/components/Tabs";
import { EmptyState } from "@/ui/components/EmptyState";
import { StatusPill } from "@/ui/components/StatusPill";
import { STATUS_PED_COR, STATUS_PED_LABEL, STATUS_SOL_COR, STATUS_SOL_LABEL } from "@/modules/squadframe/types/compras";
import { PRIORIDADE_LOTE as PRIORIDADE, STATUS_LOTE, ETAPA_LOTE_LABEL as ETAPA_LOTE } from "@/modules/squadframe/lib/planejamento-labels";

function VincularPedidoExistente({ obraId, loteId, comprasLiberadas }: { obraId: string; loteId: string; comprasLiberadas: boolean }) {
  const [pedidos, setPedidos] = useState<Awaited<ReturnType<typeof buscarPedidosDaObraPlanejamento>>>([]);
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    buscarPedidosDaObraPlanejamento(obraId).then(setPedidos);
  }, [aberto, obraId]);

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  const disponiveis = pedidos.filter((p) => p.lote_id !== loteId);

  return (
    <div ref={containerRef} className="relative">
      <Button size="sm" variant="ghost" onClick={() => setAberto((p) => !p)} disabled={!comprasLiberadas} title={!comprasLiberadas ? "Libere a compra do lote antes de vincular pedidos" : undefined}>
        Vincular pedido existente
      </Button>
      {aberto && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-border bg-surface p-3 text-sm shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Vincular pedido desta obra</p>
            <button onClick={() => setAberto(false)} className="text-xs text-text-3 hover:text-danger">Fechar</button>
          </div>
          {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {disponiveis.length === 0 && <p className="text-xs text-text-3">Nenhum pedido disponível nesta obra.</p>}
            {disponiveis.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-bg/40 px-2.5 py-1.5">
                <span className="font-mono text-xs font-semibold text-primary">{p.numero}</span>
                <span className="text-xs text-text-2">{p.fornecedor?.nome ?? "—"}</span>
                {p.lote_id && <span className="text-[10px] text-text-3">(já vinculado a outro lote)</span>}
                <Button
                  size="sm"
                  className="ml-auto text-xs"
                  disabled={pending}
                  onClick={() => {
                    setErro(null);
                    startTransition(async () => {
                      try {
                        await vincularPedidoLote(p.id, loteId);
                        router.refresh();
                        setAberto(false);
                      } catch (e: any) {
                        setErro(e.message);
                      }
                    });
                  }}
                >
                  Vincular
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LoteCard({
  lote,
  obraId,
  defaultOpen,
}: {
  lote: LotePlanejamento;
  obraId: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editando, setEditando] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const total = lote.tipologias.length;
  const concluidas = lote.tipologias.filter((t) => t.status === "pronto" || t.status === "entregue").length;
  const totalPreco = lote.pedidos.reduce((s, p) => s + (p.valor_final ?? p.valor_itens ?? 0), 0);
  const prioridade = lote.prioridade ? PRIORIDADE[lote.prioridade as keyof typeof PRIORIDADE] : null;
  const statusInfo = STATUS_LOTE[lote.status as keyof typeof STATUS_LOTE];
  const prazoAtrasado = !!lote.prazo && new Date(lote.prazo) < new Date() && concluidas < total;

  function handleExcluir() {
    startTransition(async () => {
      await excluirLote(lote.id, obraId);
      router.refresh();
    });
  }

  function handleSalvarEdicao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      try {
        await editarLotePlanejamento(lote.id, obraId, fd);
        setEditando(false);
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  function handleLiberar() {
    startTransition(async () => {
      await alternarLiberacaoComprasPlanejamento(lote.id, obraId, true);
      router.refresh();
    });
  }

  function handleBloquear() {
    if (!motivoBloqueio.trim()) return;
    startTransition(async () => {
      await alternarLiberacaoComprasPlanejamento(lote.id, obraId, false, motivoBloqueio);
      setBloqueando(false);
      setMotivoBloqueio("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-1.5 rounded-t-xl px-4 py-3 bg-bg/60">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen((p) => !p)} className="flex flex-1 items-center gap-2 text-left min-w-0">
            <span className="font-medium text-sm text-text truncate">{lote.nome}</span>
            {lote.numero_externo && (
              <span className="shrink-0 font-mono text-[11px] text-text-3">Nº ext. {lote.numero_externo}</span>
            )}
            {prioridade && <StatusPill size="xs" cor={prioridade.cor} label={prioridade.label} />}
            {statusInfo && <StatusPill size="xs" cor={statusInfo.cor} label={statusInfo.label} />}
            <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-3">
              {ETAPA_LOTE[lote.etapa as keyof typeof ETAPA_LOTE] ?? lote.etapa}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${lote.compras_liberadas ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
            >
              {lote.compras_liberadas ? "Compra liberada" : "Compra bloqueada"}
            </span>
            {total > 0 && (
              <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-3">
                {concluidas}/{total}
              </span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-text-3 transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {confirmarExcluir ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="danger" size="sm" onClick={handleExcluir} disabled={pending} className="px-2">
                {pending ? "…" : "Excluir tudo"}
              </Button>
              <button onClick={() => setConfirmarExcluir(false)} className="rounded-md px-2 py-1 text-xs text-text-3 hover:bg-bg">Cancelar</button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>Editar</Button>
              <button
                onClick={() => setConfirmarExcluir(true)}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-danger-soft hover:text-danger transition-colors"
                title="Excluir lote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {(lote.descricao || lote.prazo || totalPreco > 0 || lote.compras_motivo_bloqueio) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-text-3">
            {lote.descricao && <span className="truncate max-w-[320px]">{lote.descricao}</span>}
            {lote.prazo && (
              <span className={prazoAtrasado ? "font-medium text-danger" : ""}>
                Prazo: {new Date(lote.prazo).toLocaleDateString("pt-BR")}
              </span>
            )}
            {totalPreco > 0 && (
              <span className="font-medium text-text">{totalPreco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            )}
            {!lote.compras_liberadas && lote.compras_motivo_bloqueio && (
              <span className="text-danger">Bloqueio: {lote.compras_motivo_bloqueio}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pl-1">
          {lote.compras_liberadas ? (
            bloqueando ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={motivoBloqueio}
                  onChange={(e) => setMotivoBloqueio(e.target.value)}
                  placeholder="Motivo do bloqueio"
                  className="field h-8 w-56 text-xs"
                />
                <Button size="sm" variant="danger" onClick={handleBloquear} disabled={pending || !motivoBloqueio.trim()}>Bloquear</Button>
                <button onClick={() => setBloqueando(false)} className="text-xs text-text-3 hover:text-danger">Cancelar</button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setBloqueando(true)} disabled={pending}>Bloquear compra</Button>
            )
          ) : (
            <Button size="sm" onClick={handleLiberar} disabled={pending}>{pending ? "Liberando…" : "Liberar compra"}</Button>
          )}
          <VincularPedidoExistente obraId={obraId} loteId={lote.id} comprasLiberadas={lote.compras_liberadas} />
        </div>
      </div>

      {open && (
        <div className="p-3">
          <Tabs defaultTab="tipologias">
            <TabList variant="underline">
              <Tab id="tipologias">Tipologias</Tab>
              <Tab id="solicitacoes" badge={lote.solicitacoes.length || undefined}>Solicitações</Tab>
              <Tab id="pedidos" badge={lote.pedidos.length || undefined}>Pedidos</Tab>
            </TabList>

            <TabPanel id="tipologias" className="pt-3 space-y-2">
              {lote.tipologias.length === 0 ? (
                <EmptyState size="sm" title="Nenhuma tipologia neste lote" />
              ) : (
                lote.tipologias.map((t) => (
                  <div key={t.id} className="card flex items-center gap-3 p-3 text-sm">
                    <span className="font-semibold text-text">{t.tipo || t.nome}</span>
                    {t.codigo_esquadria && <span className="font-mono text-xs text-text-3">{t.codigo_esquadria}</span>}
                    <span className="ml-auto text-xs text-text-2">{t.quantidade} {t.quantidade === 1 ? "peça" : "peças"}</span>
                  </div>
                ))
              )}
            </TabPanel>

            <TabPanel id="solicitacoes" className="pt-3 space-y-2">
              {lote.solicitacoes.length === 0 ? (
                <EmptyState size="sm" title="Nenhuma solicitação vinculada a este lote" />
              ) : (
                lote.solicitacoes.map((s) => {
                  const cor = STATUS_SOL_COR[s.status as keyof typeof STATUS_SOL_COR] ?? "#94a3b8";
                  const label = STATUS_SOL_LABEL[s.status as keyof typeof STATUS_SOL_LABEL] ?? s.status;
                  return (
                    <Link key={s.id} href={`/squadframe/compras/solicitacoes/${s.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm hover:bg-bg transition-colors">
                      <span className="font-mono font-bold text-primary">{s.numero}</span>
                      <StatusPill size="xs" cor={cor} label={label} />
                      {s.solicitante?.nome && <span className="text-text-2">{s.solicitante.nome}</span>}
                    </Link>
                  );
                })
              )}
            </TabPanel>

            <TabPanel id="pedidos" className="pt-3 space-y-2">
              {lote.pedidos.length === 0 ? (
                <EmptyState size="sm" title="Nenhum pedido vinculado a este lote" />
              ) : (
                lote.pedidos.map((p) => {
                  const cor = STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] ?? "#94a3b8";
                  const label = STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status;
                  return (
                    <Link key={p.id} href={`/squadframe/compras/pedidos/${p.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm hover:bg-bg transition-colors">
                      <span className="font-mono font-bold text-primary">{p.numero}</span>
                      <StatusPill size="xs" cor={cor} label={label} />
                      {p.fornecedor?.nome && <span className="text-text-2">{p.fornecedor.nome}</span>}
                    </Link>
                  );
                })
              )}
            </TabPanel>
          </Tabs>
        </div>
      )}

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar lote" size="sm">
        <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-4">
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <Input label="Nome" name="nome" required defaultValue={lote.nome} />
          <Input label="Número externo" name="numero_externo" defaultValue={lote.numero_externo ?? ""} placeholder="Número do outro sistema (ERP)" />
          <Textarea label="Descrição" name="descricao" defaultValue={lote.descricao ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prioridade</label>
              <select name="prioridade" defaultValue={lote.prioridade ?? "MEDIA"} className="field h-9 text-sm">
                {Object.entries(PRIORIDADE).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prazo</label>
              <input type="date" name="prazo" defaultValue={lote.prazo ?? ""} className="field h-9 text-sm" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={lote.status} className="field h-9 text-sm">
                {Object.entries(STATUS_LOTE).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Etapa</label>
              <select name="etapa" defaultValue={lote.etapa} className="field h-9 text-sm">
                {Object.entries(ETAPA_LOTE).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setEditando(false)} disabled={pending} variant="ghost">Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
