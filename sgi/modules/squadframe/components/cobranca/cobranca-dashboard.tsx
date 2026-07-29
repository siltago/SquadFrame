import Link from "next/link";
import { InboxIcon, DocumentIcon, TruckIcon, AlertTriangleIcon } from "@/ui/icons";
import { StatCard } from "@/modules/squadframe/components/stat-card";
import {
  PedidoStatusBarChart,
  SolicitacaoStatusBarChart,
  type PedidoStatusCount,
  type SolicitacaoStatusCount,
} from "./status-bar-chart";

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

export function CobrancaDashboard({
  kpis,
  statusPedidos,
  statusSolicitacoes,
  pedidosAprovacao,
  solicitacoesAprovacao,
  pedidosEmEntrega,
  pedidosAtrasados,
  alertas,
}: {
  kpis: CobrancaKpis;
  statusPedidos: PedidoStatusCount[];
  statusSolicitacoes: SolicitacaoStatusCount[];
  pedidosAprovacao: PedidoAprovacaoRow[];
  solicitacoesAprovacao: SolicitacaoAprovacaoRow[];
  pedidosEmEntrega: PedidoEntregaRow[];
  pedidosAtrasados: PedidoPrazoRow[];
  alertas?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-text-2">
        Visão geral de pedidos e solicitações de compra: o que está parado aguardando aprovação,
        o que está a caminho e o que já passou do prazo combinado.
      </p>

      {alertas && <div className="mt-6">{alertas}</div>}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pedidos a aprovar" value={kpis.pedidosAguardandoAprovacao} icon={InboxIcon} />
        <StatCard label="Solicitações a aprovar" value={kpis.solicitacoesAguardandoAprovacao} icon={DocumentIcon} />
        <StatCard label="Pedidos em entrega" value={kpis.pedidosEmEntrega} sub="Aguardando recebimento" icon={TruckIcon} />
        <StatCard
          label="Pedidos atrasados"
          value={kpis.pedidosPrazoVencido}
          sub="Prazo de entrega vencido"
          tone={kpis.pedidosPrazoVencido > 0 ? "danger" : undefined}
          icon={AlertTriangleIcon}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PedidoStatusBarChart titulo="Pedidos por status" dados={statusPedidos} />
        <SolicitacaoStatusBarChart titulo="Solicitações por status" dados={statusSolicitacoes} />
      </div>

      {/* Pedidos aguardando aprovação */}
      <div className="mt-4 card overflow-x-auto">
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
                <td className="px-5 py-2.5 tabular-nums text-text-2">{p.dias_aberto}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solicitações aguardando aprovação */}
      <div className="mt-4 card overflow-x-auto">
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
                <td className="px-5 py-2.5 tabular-nums text-text-2">{s.dias_aberto}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pedidos em entrega */}
      <div className="mt-4 card overflow-x-auto">
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
                <td className="px-5 py-2.5 tabular-nums text-text-2">{p.dias_restantes != null ? `${p.dias_restantes}d` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pedidos com prazo de entrega vencido */}
      <div className="mt-4 card overflow-x-auto">
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
                  <span className="tabular-nums font-medium text-danger">{p.dias_atraso}d</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
