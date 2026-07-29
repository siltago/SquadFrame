"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface MesValor {
  mes: string;      // "2026-07"
  mesLabel: string; // "07/2026"
  valor: number;
}

const COR_BARRA = "rgb(var(--color-primary))";
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

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: MesValor }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text">{p.mesLabel}</p>
      <p className="mt-0.5 tabular-nums text-text-2">{fmt(p.valor)}</p>
    </div>
  );
}

// Série temporal discreta (mês a mês) — colunas verticais, rótulos curtos
// (MM/AAAA) cabem sem rotação. Hue único: é a mesma métrica ao longo do
// tempo, não categorias distintas.
export function EvolucaoMensalChart({ dados }: { dados: MesValor[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-text">Evolução mensal</h2>
      </div>
      <div className="px-2 py-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={COR_GRADE} strokeDasharray="3 3" />
            <XAxis dataKey="mesLabel" tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} />
            <YAxis tickFormatter={fmtCompacto} tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} width={56} />
            <Tooltip content={(props: any) => <ChartTooltip {...props} />} cursor={{ fill: "rgb(var(--color-surface-2))" }} isAnimationActive={false} />
            <Bar dataKey="valor" fill={COR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
