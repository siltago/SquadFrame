"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from "recharts";

export interface PedidoStatusItem {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  dias: number;
}

export interface PedidoStatusCount {
  status: string;
  label: string;
  total: number;
  itens: PedidoStatusItem[];
}

export interface SolicitacaoStatusItem {
  id: string;
  numero: string;
  obra: string;
  solicitante: string;
  dias: number;
}

export interface SolicitacaoStatusCount {
  status: string;
  label: string;
  total: number;
  itens: SolicitacaoStatusItem[];
}

const COR_BARRA = "rgb(var(--color-accent))";
const COR_BARRA_ATIVA = "rgb(var(--color-accent-hover))";
const COR_GRADE = "rgb(var(--color-border))";
const COR_EIXO = "rgb(var(--color-text-3))";

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; total: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text">{p.label}</p>
      <p className="mt-0.5 tabular-nums text-text-2">
        {p.total} {p.total === 1 ? "registro" : "registros"}
      </p>
    </div>
  );
}

// Comparação de magnitude entre categorias de status — barra horizontal
// (rótulos de status variam bastante em comprimento, ex. "Aguardando
// Recebimento", então orientação horizontal evita truncar/rotacionar
// texto). Um hue só (sequencial): não há hierarquia de identidade entre
// status aqui, só contagem. Cada barra é clicável e expande a lista de
// itens daquele status — refinamento, não navegação separada.
function StatusBarChart<T extends { id: string; numero: string }>({
  titulo,
  total,
  dados,
  renderItem,
}: {
  titulo: string;
  total: number;
  dados: { status: string; label: string; total: number; itens: T[] }[];
  renderItem: (item: T) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const altura = Math.max(120, dados.length * 34);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-text">{titulo}</h2>
        <span className="text-xs font-medium tabular-nums text-text-3">{total} no total</span>
      </div>

      {dados.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-text-3">Nenhum dado ainda.</p>
      ) : (
        <>
          <div className="px-2 pt-3" style={{ height: altura }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                barCategoryGap={10}
                onClick={(state) => {
                  const label = (state as { activeLabel?: string })?.activeLabel;
                  const clicado = dados.find((d) => d.label === label);
                  if (clicado) setAberto(aberto === clicado.status ? null : clicado.status);
                }}
              >
                <defs>
                  <linearGradient id="squadui-barra-status" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COR_BARRA} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={COR_BARRA} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="squadui-barra-status-ativa" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COR_BARRA_ATIVA} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={COR_BARRA_ATIVA} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke={COR_GRADE} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: COR_EIXO, fontSize: 11 }}
                  axisLine={{ stroke: COR_GRADE }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={132}
                  tick={{ fill: COR_EIXO, fontSize: 11 }}
                  axisLine={{ stroke: COR_GRADE }}
                  tickLine={false}
                />
                <Tooltip content={(props: any) => <ChartTooltip {...props} />} cursor={{ fill: "rgb(var(--color-surface-2))" }} isAnimationActive={false} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive animationDuration={700} animationEasing="ease-out" cursor="pointer">
                  {dados.map((d) => (
                    <Cell key={d.status} fill={`url(#${aberto === d.status ? "squadui-barra-status-ativa" : "squadui-barra-status"})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {aberto && (() => {
            const secao = dados.find((d) => d.status === aberto);
            if (!secao) return null;
            return (
              <div className="border-t border-border bg-bg/40 px-5 py-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">{secao.label}</p>
                {secao.itens.length === 0 ? (
                  <p className="py-1 text-xs text-text-3">Nenhum item.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {secao.itens.map((item) => (
                      <div key={item.id}>{renderItem(item)}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function PedidoStatusItemRow({ item }: { item: PedidoStatusItem }) {
  return (
    <Link
      href={`/squadframe/compras/pedidos/${item.id}`}
      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-surface-2"
    >
      <span className="shrink-0 font-mono font-semibold text-primary">{item.numero}</span>
      <span className="min-w-0 flex-1 truncate text-text-2">{item.obra} · {item.fornecedor}</span>
      <span className="shrink-0 tabular-nums text-text-3">{item.dias}d</span>
    </Link>
  );
}

function SolicitacaoStatusItemRow({ item }: { item: SolicitacaoStatusItem }) {
  return (
    <Link
      href={`/squadframe/compras/solicitacoes/${item.id}`}
      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-surface-2"
    >
      <span className="shrink-0 font-mono font-semibold text-primary">{item.numero}</span>
      <span className="min-w-0 flex-1 truncate text-text-2">{item.obra} · {item.solicitante}</span>
      <span className="shrink-0 tabular-nums text-text-3">{item.dias}d</span>
    </Link>
  );
}

export function PedidoStatusBarChart({ titulo, dados }: { titulo: string; dados: PedidoStatusCount[] }) {
  const total = dados.reduce((acc, d) => acc + d.total, 0);
  return <StatusBarChart titulo={titulo} total={total} dados={dados} renderItem={(item) => <PedidoStatusItemRow item={item} />} />;
}

export function SolicitacaoStatusBarChart({ titulo, dados }: { titulo: string; dados: SolicitacaoStatusCount[] }) {
  const total = dados.reduce((acc, d) => acc + d.total, 0);
  return <StatusBarChart titulo={titulo} total={total} dados={dados} renderItem={(item) => <SolicitacaoStatusItemRow item={item} />} />;
}
