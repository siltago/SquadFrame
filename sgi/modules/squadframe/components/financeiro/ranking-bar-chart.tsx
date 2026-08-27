"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export interface RankingItem {
  nome: string;
  total: number;
  count: number;
}

const COR_BARRA = "rgb(var(--color-accent))";
const COR_GRADE = "rgb(var(--color-border))";
const COR_EIXO = "rgb(var(--color-text-3))";

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtCompacto(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function truncar(texto: string, max = 22): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: RankingItem }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text">{p.nome}</p>
      <p className="mt-0.5 tabular-nums text-text-2">{fmt(p.total)}</p>
      <p className="tabular-nums text-text-3">{p.count} pedido{p.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

// Ranking por valor (fornecedor/obra) — barra horizontal, hue único
// (magnitude, não identidade categórica). Limita aos top N pra não deixar
// o card com dezenas de barras de 1 pixel; o resto soma numa linha "Outros".
export function RankingBarChart({ titulo, dados, limite = 8 }: { titulo: string; dados: RankingItem[]; limite?: number }) {
  const top = dados.slice(0, limite).map((d) => ({ ...d, nomeCurto: truncar(d.nome) }));
  const restante = dados.slice(limite);
  if (restante.length > 0) {
    top.push({
      nome: `Outros (${restante.length})`,
      nomeCurto: `Outros (${restante.length})`,
      total: restante.reduce((s, d) => s + d.total, 0),
      count: restante.reduce((s, d) => s + d.count, 0),
    });
  }
  const altura = Math.max(140, top.length * 34);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-text">{titulo}</h2>
      </div>
      {top.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-text-3">Nenhum dado no período.</p>
      ) : (
        <div className="px-2 py-3" style={{ height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap={10}>
              <defs>
                <linearGradient id="squadui-barra-ranking" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COR_BARRA} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={COR_BARRA} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke={COR_GRADE} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={fmtCompacto} tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} />
              <YAxis type="category" dataKey="nomeCurto" width={140} tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} />
              <Tooltip content={(props: any) => <ChartTooltip {...props} />} cursor={{ fill: "rgb(var(--color-surface-2))" }} isAnimationActive={false} />
              <Bar dataKey="total" fill="url(#squadui-barra-ranking)" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive animationDuration={700} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
