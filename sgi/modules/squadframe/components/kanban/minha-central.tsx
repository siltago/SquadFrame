"use client";

import { useState } from "react";
import Link from "next/link";
import { CardPanel } from "./card-panel";
import { PRIORIDADE_COR, ORIGEM_COR, ORIGEM_LABEL, TarefaPrioridade, TarefaOrigem } from "@/modules/squadframe/types/kanban";
import { Badge, ColorBadge, type BadgeVariant } from "@/ui/components/Badge";
import { Card } from "@/ui/components/Card";
import { EmptyState } from "@/ui/components/EmptyState";
import { Button } from "@/ui/components/Button";

type PedidoParaAprovar = {
  id: string;
  numero: string;
  tipo_linha: string | null;
  criado_em: string;
  fornecedor: { nome: string } | null;
  obra: { nome: string } | null;
};

type TarefaCentral = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  data_limite: string | null;
  setor_id: string | null;
  origem: string;
  setor: { nome: string } | null;
  coluna: { nome: string } | null;
  responsavel: { id: string; nome: string } | null;
  etiquetas: Array<{ etiqueta: { id: string; nome: string; cor: string } | null }>;
};

interface Props {
  minhasTarefas: TarefaCentral[];
  setorTarefas: TarefaCentral[];
  pedidosParaAprovar?: PedidoParaAprovar[];
  usuarioId: string;
  usuarioNome: string;
}

const STATUS_LABEL: Record<string, string> = {
  SEM_DONO:    "Sem dono",
  ACEITA:      "Aceita",
  EM_ANDAMENTO:"Em andamento",
  AGUARDANDO:  "Aguardando",
  CONCLUIDA:   "Concluída",
  CANCELADA:   "Cancelada",
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  SEM_DONO:    "default",
  ACEITA:      "info",
  EM_ANDAMENTO:"success",
  AGUARDANDO:  "warning",
  CONCLUIDA:   "accent",
  CANCELADA:   "danger",
};

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

function isToday(d: string | null): boolean {
  if (!d) return false;
  return d === new Date().toISOString().split("T")[0];
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function PedidoRow({ p }: { p: PedidoParaAprovar }) {
  const tipo = p.tipo_linha?.toLowerCase() ?? "compra";
  const subtitulo = [p.fornecedor?.nome, p.obra?.nome].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/compras/pedidos/${p.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-bg transition-colors"
    >
      <div className="shrink-0 h-2.5 w-1.5 rounded-full bg-warning" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{p.numero}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-3 capitalize">{tipo}</span>
          {subtitulo && (
            <>
              <span className="text-text-3 text-xs">·</span>
              <span className="text-xs text-text-3 truncate">{subtitulo}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="warning" size="sm">Aprovar</Badge>
    </Link>
  );
}

function TarefaRow({ t, onOpen }: { t: TarefaCentral; onOpen: (id: string) => void }) {
  const overdue = isOverdue(t.data_limite);
  const today   = isToday(t.data_limite);
  const etiquetas = t.etiquetas.map((te) => te.etiqueta).filter(Boolean);

  return (
    <div
      onClick={() => onOpen(t.id)}
      className="group flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-bg cursor-pointer transition-colors"
    >
      <div
        className="shrink-0 h-2.5 w-1.5 rounded-full"
        style={{ backgroundColor: PRIORIDADE_COR[t.prioridade as TarefaPrioridade] }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{t.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {t.setor && <span className="text-xs text-text-3">{t.setor.nome}</span>}
          {t.coluna && (
            <>
              <span className="text-text-3 text-xs">·</span>
              <span className="text-xs text-text-3">{t.coluna.nome}</span>
            </>
          )}
          {t.origem !== "MANUAL" && (
            <ColorBadge
              color={ORIGEM_COR[t.origem as TarefaOrigem]}
              label={ORIGEM_LABEL[t.origem as TarefaOrigem]}
              size="sm"
            />
          )}
          {etiquetas.slice(0, 3).map((et: any) => (
            <ColorBadge key={et.id} color={et.cor} label={et.nome} size="sm" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={STATUS_VARIANT[t.status] ?? "default"} size="sm">
          {STATUS_LABEL[t.status] ?? t.status}
        </Badge>
        {t.data_limite && (
          <span className={`text-xs font-medium ${overdue ? "text-danger font-semibold" : today ? "text-warning" : "text-text-3"}`}>
            {overdue ? "⚠ " : today ? "hoje " : ""}{formatDate(t.data_limite)}
          </span>
        )}
        <Link
          href={`/tarefas/${t.id}`}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-3 hover:text-primary transition-all"
          title="Abrir em nova página"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </Link>
      </div>
    </div>
  );
}

function Secao({
  titulo,
  icone,
  tarefas,
  cor,
  onOpen,
  defaultOpen = true,
}: {
  titulo: string;
  icone: React.ReactNode;
  tarefas: TarefaCentral[];
  cor: string;
  onOpen: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [aberta, setAberta] = useState(defaultOpen);

  return (
    <Card padding="none" className="overflow-hidden mb-4">
      <button
        onClick={() => setAberta((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 border-b border-border hover:bg-bg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: cor }}>{icone}</span>
          <span className="text-sm font-semibold text-text">{titulo}</span>
          <ColorBadge color={cor} label={String(tarefas.length)} size="sm" />
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="14" height="14"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-text-3 transition-transform duration-150 ${aberta ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {aberta && (
        tarefas.length === 0
          ? <EmptyState size="sm" title="Nenhuma tarefa" />
          : tarefas.map((t) => <TarefaRow key={t.id} t={t} onOpen={onOpen} />)
      )}
    </Card>
  );
}

export function MinhaCentral({ minhasTarefas, setorTarefas, pedidosParaAprovar = [], usuarioId, usuarioNome }: Props) {
  const [panelTarefaId, setPanelTarefaId] = useState<string | null>(null);

  const hoje = new Date().toISOString().split("T")[0];

  const atrasadas = minhasTarefas.filter((t) => t.data_limite && t.data_limite < hoje);
  const paraHoje  = minhasTarefas.filter((t) => !atrasadas.some((a) => a.id === t.id) && t.data_limite === hoje);
  const ativas    = minhasTarefas.filter(
    (t) =>
      !atrasadas.some((a) => a.id === t.id) &&
      !paraHoje.some((a) => a.id === t.id) &&
      t.status !== "AGUARDANDO" &&
      t.status !== "SEM_DONO" &&
      (!t.data_limite || t.data_limite > hoje)
  );
  const aguardando = minhasTarefas.filter(
    (t) =>
      !atrasadas.some((a) => a.id === t.id) &&
      !paraHoje.some((a) => a.id === t.id) &&
      t.status === "AGUARDANDO"
  );
  const semDono    = minhasTarefas.filter((t) => t.status === "SEM_DONO");
  const setorSemDono = setorTarefas.filter((t) => !minhasTarefas.some((m) => m.id === t.id));

  const total = minhasTarefas.length;

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 py-4 border-b border-border bg-surface">
        <h1 className="font-display text-xl font-bold text-text">Minha Central</h1>
        <p className="text-xs text-text-3 mt-0.5">
          Olá, {usuarioNome} · {total} {total === 1 ? "tarefa ativa" : "tarefas ativas"}
        </p>
      </div>

      <div className="px-5 py-5 max-w-4xl">
        {pedidosParaAprovar.length > 0 && (
          <Card padding="none" className="overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="text-warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <span className="text-sm font-semibold text-text">Pedidos para aprovar</span>
              <Badge variant="warning" size="sm">{pedidosParaAprovar.length}</Badge>
            </div>
            {pedidosParaAprovar.map((p) => <PedidoRow key={p.id} p={p} />)}
          </Card>
        )}

        {atrasadas.length > 0 && (
          <Secao
            titulo="Atrasadas"
            icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            tarefas={atrasadas}
            cor="#ef4444"
            onOpen={setPanelTarefaId}
          />
        )}

        {paraHoje.length > 0 && (
          <Secao
            titulo="Para hoje"
            icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            tarefas={paraHoje}
            cor="#f97316"
            onOpen={setPanelTarefaId}
          />
        )}

        <Secao
          titulo="Em andamento"
          icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
          tarefas={ativas}
          cor="#10b981"
          onOpen={setPanelTarefaId}
        />

        {aguardando.length > 0 && (
          <Secao
            titulo="Aguardando"
            icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            tarefas={aguardando}
            cor="#f59e0b"
            onOpen={setPanelTarefaId}
            defaultOpen={false}
          />
        )}

        {semDono.length > 0 && (
          <Secao
            titulo="Sem dono (minhas)"
            icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
            tarefas={semDono}
            cor="#9ca3af"
            onOpen={setPanelTarefaId}
            defaultOpen={false}
          />
        )}

        {setorSemDono.length > 0 && (
          <Secao
            titulo="Sem dono no setor"
            icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            tarefas={setorSemDono}
            cor="#6366f1"
            onOpen={setPanelTarefaId}
            defaultOpen={false}
          />
        )}

        {(() => {
          const categorizadas = new Set([...atrasadas, ...paraHoje, ...ativas, ...aguardando, ...semDono].map((t) => t.id));
          const outras = minhasTarefas.filter((t) => !categorizadas.has(t.id));
          return outras.length > 0 ? (
            <Secao
              titulo="Outras atribuídas"
              icone={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
              tarefas={outras}
              cor="#6b7280"
              onOpen={setPanelTarefaId}
            />
          ) : null;
        })()}

        {total === 0 && setorSemDono.length === 0 && pedidosParaAprovar.length === 0 && (
          <Card padding="none">
            <EmptyState
              title="Tudo em dia!"
              description="Nenhuma tarefa ativa atribuída a você."
              action={
                <Button as="a" href="/tarefas" variant="ghost" size="sm">
                  Ver board do setor →
                </Button>
              }
            />
          </Card>
        )}
      </div>

      {panelTarefaId && (
        <CardPanel tarefaId={panelTarefaId} onClose={() => setPanelTarefaId(null)} />
      )}
    </div>
  );
}
