import Link from "next/link";
import { InboxIcon, DocumentIcon, TruckIcon, AlertTriangleIcon, ChevronRightIcon, PackageIcon } from "@/ui/icons";
import { StatCard } from "@/ui/components/Card";
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

// Badge circular colorido que abre cada linha da lista — mesma ideia do
// ícone por atividade da referência visual, cor herdada do "tone" da seção
// (nunca uma cor nova, sempre as semânticas já existentes).
function IconeLinha({ tone, children }: { tone: "primary" | "warning" | "danger"; children: React.ReactNode }) {
  const cores: Record<typeof tone, string> = {
    primary: "bg-accent/14 text-accent",
    warning: "bg-warning-soft text-warning",
    danger:  "bg-danger-soft text-danger",
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-110 ${cores[tone]}`}>
      {children}
    </span>
  );
}

function Pill({ tone, children }: { tone: "neutral" | "warning" | "danger"; children: React.ReactNode }) {
  const cores: Record<typeof tone, string> = {
    neutral: "bg-surface-2 text-text-2",
    warning: "bg-warning-soft text-warning",
    danger:  "bg-danger-soft text-danger",
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${cores[tone]}`}>
      {children}
    </span>
  );
}

function ListaVazia({ texto }: { texto: string }) {
  return <p className="px-5 py-10 text-center text-sm text-text-3">{texto}</p>;
}

function ListaSection({
  titulo,
  contagem,
  vazio,
  children,
}: {
  titulo: string;
  contagem: number;
  vazio: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-text">{titulo}</h2>
        <span className="text-xs font-medium tabular-nums text-text-3">
          {contagem} {contagem === 1 ? "registro" : "registros"}
        </span>
      </div>
      {contagem === 0 ? <ListaVazia texto={vazio} /> : <div className="divide-y divide-border">{children}</div>}
    </div>
  );
}

function LinhaAtividade({
  href,
  icone,
  numero,
  contexto,
  pill,
}: {
  href: string;
  icone: React.ReactNode;
  numero: string;
  contexto: string;
  pill: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-5 py-3.5 transition-colors duration-[var(--motion-hover)] hover:bg-surface-2"
    >
      {icone}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-semibold text-text">{numero}</p>
        <p className="mt-0.5 truncate text-xs text-text-3">{contexto}</p>
      </div>
      {pill}
      <ChevronRightIcon size={16} className="shrink-0 text-text-3" />
    </Link>
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
      <h1 className="text-2xl font-bold tracking-tight text-text">Dashboard</h1>
      <p className="mt-1 text-sm text-text-2">
        Visão geral de pedidos e solicitações de compra: o que está parado aguardando aprovação,
        o que está a caminho e o que já passou do prazo combinado.
      </p>

      {alertas && <div className="mt-6">{alertas}</div>}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pedidos a aprovar" value={kpis.pedidosAguardandoAprovacao} icon={<InboxIcon size={18} />} variant="accent" />
        <StatCard label="Solicitações a aprovar" value={kpis.solicitacoesAguardandoAprovacao} icon={<DocumentIcon size={18} />} />
        <StatCard label="Pedidos em entrega" value={kpis.pedidosEmEntrega} sub="Aguardando recebimento" icon={<TruckIcon size={18} />} />
        <StatCard
          label="Pedidos atrasados"
          value={kpis.pedidosPrazoVencido}
          sub="Prazo de entrega vencido"
          tone={kpis.pedidosPrazoVencido > 0 ? "danger" : undefined}
          icon={<AlertTriangleIcon size={18} />}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PedidoStatusBarChart titulo="Pedidos por status" dados={statusPedidos} />
        <SolicitacaoStatusBarChart titulo="Solicitações por status" dados={statusSolicitacoes} />
      </div>

      {/* Pedidos aguardando aprovação */}
      <div className="mt-4">
        <ListaSection titulo="Pedidos a aprovar" contagem={pedidosAprovacao.length} vazio="Nenhum pedido aguardando aprovação.">
          {pedidosAprovacao.map((p) => (
            <LinhaAtividade
              key={p.id}
              href={`/squadframe/compras/pedidos/${p.id}`}
              icone={<IconeLinha tone="primary"><PackageIcon size={16} /></IconeLinha>}
              numero={p.numero}
              contexto={`${p.obra} · ${p.fornecedor}`}
              pill={<Pill tone="neutral">{p.dias_aberto}d</Pill>}
            />
          ))}
        </ListaSection>
      </div>

      {/* Solicitações aguardando aprovação */}
      <div className="mt-4">
        <ListaSection titulo="Solicitações a aprovar" contagem={solicitacoesAprovacao.length} vazio="Nenhuma solicitação aguardando aprovação.">
          {solicitacoesAprovacao.map((s) => (
            <LinhaAtividade
              key={s.id}
              href="/squadframe/compras/solicitacoes"
              icone={<IconeLinha tone="primary"><DocumentIcon size={16} /></IconeLinha>}
              numero={s.numero}
              contexto={`${s.obra} · ${s.solicitante}`}
              pill={<Pill tone="neutral">{s.dias_aberto}d</Pill>}
            />
          ))}
        </ListaSection>
      </div>

      {/* Pedidos em entrega */}
      <div className="mt-4">
        <ListaSection titulo="Pedidos em entrega" contagem={pedidosEmEntrega.length} vazio="Nenhum pedido aguardando recebimento.">
          {pedidosEmEntrega.map((p) => (
            <LinhaAtividade
              key={p.id}
              href={`/squadframe/compras/pedidos/${p.id}`}
              icone={<IconeLinha tone="primary"><TruckIcon size={16} /></IconeLinha>}
              numero={p.numero}
              contexto={`${p.obra} · ${p.fornecedor} · ${p.prazo_entrega ? formatarData(p.prazo_entrega) : "sem prazo definido"}`}
              pill={
                p.dias_restantes != null
                  ? <Pill tone={p.dias_restantes <= 2 ? "warning" : "neutral"}>{p.dias_restantes}d</Pill>
                  : <Pill tone="neutral">—</Pill>
              }
            />
          ))}
        </ListaSection>
      </div>

      {/* Pedidos com prazo de entrega vencido */}
      <div className="mt-4">
        <ListaSection titulo="Pedidos atrasados" contagem={pedidosAtrasados.length} vazio="Nenhum pedido atrasado.">
          {pedidosAtrasados.map((p) => (
            <LinhaAtividade
              key={p.id}
              href={`/squadframe/compras/pedidos/${p.id}`}
              icone={<IconeLinha tone="danger"><AlertTriangleIcon size={16} /></IconeLinha>}
              numero={p.numero}
              contexto={`${p.obra} · ${p.fornecedor} · prazo ${formatarData(p.prazo_entrega)}`}
              pill={<Pill tone="danger">{p.dias_atraso}d de atraso</Pill>}
            />
          ))}
        </ListaSection>
      </div>
    </div>
  );
}
