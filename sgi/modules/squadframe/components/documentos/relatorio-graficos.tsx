"use client";

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const CORES = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface GrupoContagem {
  chave: string;
  quantidade: number;
  valor: number;
}

interface RelatorioGraficosProps {
  porObra: GrupoContagem[];
  porStatus: GrupoContagem[];
}

function formatarMoedaCompacta(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function truncar(texto: string, max = 16): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

// Charts empilhados (não lado a lado) — a folha A4 tem 794px de largura; em
// duas colunas cada gráfico sobra só ~360px, estreito demais pra rótulo de
// obra/status não cortar nas bordas. Empilhado, cada um usa a largura cheia.
export function RelatorioGraficos({ porObra, porStatus }: RelatorioGraficosProps) {
  const dadosObra = porObra.slice(0, 8).map((g) => ({ ...g, chaveCurta: truncar(g.chave) }));
  // Gráfico de valor por obra só faz sentido comparando 2+ obras — com uma
  // só (ou nenhuma), a barra única é redundante e a tabela de totais já cobre.
  const mostrarGraficoObra = porObra.length > 1;
  const mostrarGraficoStatus = porStatus.length > 1;

  if (!mostrarGraficoObra && !mostrarGraficoStatus) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, pageBreakInside: "avoid" }}>
      {mostrarGraficoObra && (
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Valor por obra</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dadosObra} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="chaveCurta" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatarMoedaCompacta} width={54} />
            <Tooltip
              formatter={(v) => formatarMoedaCompacta(Number(v))}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.chave ?? ""}
              isAnimationActive={false}
            />
            <Bar dataKey="valor" fill="#3b82f6" isAnimationActive={false} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      {mostrarGraficoStatus && (
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Quantidade por status</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <Pie data={porStatus} dataKey="quantidade" nameKey="chave" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false}>
              {porStatus.map((_, i) => (
                <Cell key={i} fill={CORES[i % CORES.length]} />
              ))}
            </Pie>
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 10 }} />
            <Tooltip isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
