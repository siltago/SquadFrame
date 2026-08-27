"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface MesValor {
  mes: string;      // "2026-07"
  mesLabel: string; // "07/2026"
  valor: number;
}

const COR_LINHA = "rgb(var(--color-accent))";
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

// Série temporal — área com gradiente (não coluna): reforça a leitura de
// "tendência ao longo do tempo" e casa com o resto do dashboard, que agora
// usa preenchimento em gradiente nos gráficos em vez de barra sólida.
export function EvolucaoMensalChart({ dados }: { dados: MesValor[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-text">Evolução mensal</h2>
      </div>
      <div className="px-2 py-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="squadui-area-evolucao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COR_LINHA} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COR_LINHA} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COR_GRADE} strokeDasharray="3 3" />
            <XAxis dataKey="mesLabel" tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} />
            <YAxis tickFormatter={fmtCompacto} tick={{ fill: COR_EIXO, fontSize: 11 }} axisLine={{ stroke: COR_GRADE }} tickLine={false} width={56} />
            <Tooltip content={(props: any) => <ChartTooltip {...props} />} cursor={{ stroke: COR_LINHA, strokeWidth: 1, strokeDasharray: "3 3" }} isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={COR_LINHA}
              strokeWidth={2.5}
              fill="url(#squadui-area-evolucao)"
              dot={{ r: 3, fill: COR_LINHA, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: COR_LINHA, strokeWidth: 2, stroke: "rgb(var(--color-surface))" }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
