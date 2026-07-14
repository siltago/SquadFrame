import Link from "next/link";

export interface CobrancaKpis {
  pedidosAguardandoAprovacao: number;
  solicitacoesAguardandoAprovacao: number;
  pedidosEmEntrega: number;
  pedidosPrazoVencido: number;
}

export interface PedidoAprovacaoRow {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  dias_aberto: number;
}

export interface SolicitacaoAprovacaoRow {
  id: string;
  numero: string;
  obra: string;
  solicitante: string;
  dias_aberto: number;
}

export interface PedidoEntregaRow {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  prazo_entrega: string | null; // ISO date
  dias_restantes: number | null;
}

export interface PedidoPrazoRow {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  prazo_entrega: string; // ISO date
  dias_atraso: number;
}

export interface StatusCount {
  status: string;
  label: string;
  total: number;
}

export interface TendenciaPonto {
  data: string; // ISO date (yyyy-mm-dd)
  pedidos: number;
  solicitacoes: number;
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "warning" | "danger" }) {
  const cor = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-text-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{value}</p>
      {sub && <p className="text-xs text-text-3 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function TabelaVazia({ colSpan, texto }: { colSpan: number; texto: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-text-3">
        {texto}
      </td>
    </tr>
  );
}

// Comparação de magnitude entre categorias — um hue só (sequencial), barra
// com extremidade arredondada, valor direto na ponta.
function StatusBarChart({ titulo, dados }: { titulo: string; dados: StatusCount[] }) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-text">{titulo}</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-text-3">Nenhum dado ainda.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {dados.map((d) => (
            <div key={d.status} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs text-text-2">{d.label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-surface-2">
                <div
                  className="h-2.5 rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-text">{d.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tendência de criação (pedidos x solicitações) nos últimos 14 dias — 2
// séries categóricas (primary/accent), legenda sempre visível, rótulo
// direto no ponto final de cada linha, eixo X só com início/meio/fim pra
// não poluir.
function TendenciaChart({ dados }: { dados: TendenciaPonto[] }) {
  const largura = 640;
  const altura = 200;
  const padL = 16;
  const padR = 16;
  const padT = 16;
  const padB = 22;
  const w = largura - padL - padR;
  const h = altura - padT - padB;

  const max = Math.max(1, ...dados.flatMap((d) => [d.pedidos, d.solicitacoes]));
  const passoX = dados.length > 1 ? w / (dados.length - 1) : 0;

  function pontos(chave: "pedidos" | "solicitacoes") {
    return dados.map((d, i) => ({
      x: padL + i * passoX,
      y: padT + h - (d[chave] / max) * h,
      v: d[chave],
    }));
  }

  function pathDe(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }

  const pPedidos = pontos("pedidos");
  const pSolicitacoes = pontos("solicitacoes");
  const ultimoPedido = pPedidos[pPedidos.length - 1];
  const ultimaSolicitacao = pSolicitacoes[pSolicitacoes.length - 1];

  const idxLabels = dados.length > 1 ? [0, Math.floor((dados.length - 1) / 2), dados.length - 1] : [0];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Criados nos últimos 14 dias</h2>
        <div className="flex items-center gap-4 text-xs text-text-2">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Pedidos</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Solicitações</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="mt-2 w-full" style={{ height: altura }}>
        {[0, 0.5, 1].map((f) => {
          const y = padT + h - f * h;
          return <line key={f} x1={padL} y1={y} x2={padL + w} y2={y} className="stroke-border" strokeWidth={1} />;
        })}
        {idxLabels.map((i) => (
          <text key={i} x={padL + i * passoX} y={altura - 4} textAnchor="middle" className="fill-text-3" fontSize={9}>
            {new Date(`${dados[i].data}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </text>
        ))}
        <path d={pathDe(pSolicitacoes)} fill="none" className="stroke-accent" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathDe(pPedidos)} fill="none" className="stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {ultimaSolicitacao && (
          <>
            <circle cx={ultimaSolicitacao.x} cy={ultimaSolicitacao.y} r={4} className="fill-accent" stroke="rgb(var(--color-surface))" strokeWidth={2} />
            <text x={ultimaSolicitacao.x - 6} y={ultimaSolicitacao.y + 14} textAnchor="end" className="fill-text" fontSize={10} fontWeight={700}>
              {ultimaSolicitacao.v}
            </text>
          </>
        )}
        {ultimoPedido && (
          <>
            <circle cx={ultimoPedido.x} cy={ultimoPedido.y} r={4} className="fill-primary" stroke="rgb(var(--color-surface))" strokeWidth={2} />
            <text x={ultimoPedido.x - 6} y={ultimoPedido.y - 8} textAnchor="end" className="fill-text" fontSize={10} fontWeight={700}>
              {ultimoPedido.v}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export function CobrancaDashboard({
  kpis,
  statusPedidos,
  statusSolicitacoes,
  tendencia,
  pedidosAprovacao,
  solicitacoesAprovacao,
  pedidosEmEntrega,
  pedidosAtrasados,
}: {
  kpis: CobrancaKpis;
  statusPedidos: StatusCount[];
  statusSolicitacoes: StatusCount[];
  tendencia: TendenciaPonto[];
  pedidosAprovacao: PedidoAprovacaoRow[];
  solicitacoesAprovacao: SolicitacaoAprovacaoRow[];
  pedidosEmEntrega: PedidoEntregaRow[];
  pedidosAtrasados: PedidoPrazoRow[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-text-2">
        Visão geral de pedidos e solicitações de compra: o que está parado aguardando aprovação,
        o que está a caminho e o que já passou do prazo combinado.
      </p>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Pedidos a aprovar" value={kpis.pedidosAguardandoAprovacao} />
        <KpiCard label="Solicitações a aprovar" value={kpis.solicitacoesAguardandoAprovacao} />
        <KpiCard label="Pedidos em entrega" value={kpis.pedidosEmEntrega} sub="Aguardando Recebimento" />
        <KpiCard
          label="Pedidos atrasados"
          value={kpis.pedidosPrazoVencido}
          sub="Prazo de entrega vencido"
          tone={kpis.pedidosPrazoVencido > 0 ? "danger" : undefined}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6">
        <TendenciaChart dados={tendencia} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBarChart titulo="Pedidos por status" dados={statusPedidos} />
        <StatusBarChart titulo="Solicitações por status" dados={statusSolicitacoes} />
      </div>

      {/* Pedidos aguardando aprovação */}
      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Pedidos a aprovar</h2>
          <span className="text-xs text-text-3">
            {pedidosAprovacao.length} pedido{pedidosAprovacao.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {pedidosAprovacao.length === 0 ? (
              <TabelaVazia colSpan={4} texto="Nenhum pedido aguardando aprovação." />
            ) : pedidosAprovacao.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">
                  <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                    {p.numero}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-text-2">{p.obra}</td>
                <td className="px-5 py-2.5 text-text-2">{p.fornecedor}</td>
                <td className="px-5 py-2.5 text-text-2">{p.dias_aberto}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solicitações aguardando aprovação */}
      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Solicitações a aprovar</h2>
          <span className="text-xs text-text-3">
            {solicitacoesAprovacao.length} solicitação{solicitacoesAprovacao.length !== 1 ? "ões" : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Solicitação</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Solicitante</th>
              <th className="px-5 py-2 font-medium">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {solicitacoesAprovacao.length === 0 ? (
              <TabelaVazia colSpan={4} texto="Nenhuma solicitação aguardando aprovação." />
            ) : solicitacoesAprovacao.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">
                  <Link href="/squadframe/compras/solicitacoes" className="font-mono text-sm font-semibold text-primary hover:underline">
                    {s.numero}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-text-2">{s.obra}</td>
                <td className="px-5 py-2.5 text-text-2">{s.solicitante}</td>
                <td className="px-5 py-2.5 text-text-2">{s.dias_aberto}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pedidos em entrega */}
      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Pedidos em entrega</h2>
          <span className="text-xs text-text-3">
            {pedidosEmEntrega.length} pedido{pedidosEmEntrega.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Prazo de entrega</th>
              <th className="px-5 py-2 font-medium">Faltam</th>
            </tr>
          </thead>
          <tbody>
            {pedidosEmEntrega.length === 0 ? (
              <TabelaVazia colSpan={5} texto="Nenhum pedido aguardando recebimento." />
            ) : pedidosEmEntrega.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">
                  <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                    {p.numero}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-text-2">{p.obra}</td>
                <td className="px-5 py-2.5 text-text-2">{p.fornecedor}</td>
                <td className="px-5 py-2.5 text-text-2">{p.prazo_entrega ? formatarData(p.prazo_entrega) : "Sem prazo definido"}</td>
                <td className="px-5 py-2.5 text-text-2">{p.dias_restantes != null ? `${p.dias_restantes}d` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pedidos com prazo de entrega vencido */}
      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Pedidos atrasados</h2>
          <span className="text-xs text-text-3">
            {pedidosAtrasados.length} pedido{pedidosAtrasados.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Prazo de entrega</th>
              <th className="px-5 py-2 font-medium">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {pedidosAtrasados.length === 0 ? (
              <TabelaVazia colSpan={5} texto="Nenhum pedido atrasado." />
            ) : pedidosAtrasados.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">
                  <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                    {p.numero}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-text-2">{p.obra}</td>
                <td className="px-5 py-2.5 text-text-2">{p.fornecedor}</td>
                <td className="px-5 py-2.5 text-text-2">{formatarData(p.prazo_entrega)}</td>
                <td className="px-5 py-2.5">
                  <span className="text-danger font-medium">{p.dias_atraso}d</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
