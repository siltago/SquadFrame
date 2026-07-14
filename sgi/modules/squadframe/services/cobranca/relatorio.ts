import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeSaoPaulo } from "./executar-cobranca";
import type {
  CobrancaKpis,
  PedidoAprovacaoRow,
  SolicitacaoAprovacaoRow,
  PedidoEntregaRow,
  PedidoPrazoRow,
  StatusCount,
  TendenciaPonto,
} from "../../components/cobranca/cobranca-dashboard";

function diasEntre(dataISO: string, hojeISO: string): number {
  const diffMs = new Date(`${hojeISO}T00:00:00Z`).getTime() - new Date(`${dataISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function diasAte(dataISO: string, hojeISO: string): number {
  const diffMs = new Date(`${dataISO}T00:00:00Z`).getTime() - new Date(`${hojeISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

// PostgREST não expõe a cardinalidade real do join pro tipo genérico
// SupabaseClient (uma FK simples sempre volta 1 objeto, mas o tipo inferido
// permite array) — *Raw modela o shape real da resposta pra normalizar sem `any`.
type NomeRelacao = { nome: string } | { nome: string }[] | null;

function nomeDaRelacao(v: NomeRelacao): string | null {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? null;
}

type PedidoAprovacaoSelectRow = {
  id: string;
  numero: string;
  criado_em: string;
  obra: NomeRelacao;
  fornecedor: NomeRelacao;
};

async function buscarPedidosAprovacaoDetalhe(admin: SupabaseClient, hojeISO: string): Promise<PedidoAprovacaoRow[]> {
  const { data } = await admin
    .from("pedidos_compra")
    .select("id, numero, criado_em, obra:obras(nome), fornecedor:fornecedores(nome)")
    .eq("status", "AGUARDANDO_APROVACAO")
    .order("criado_em", { ascending: true });

  const linhas = (data ?? []) as unknown as PedidoAprovacaoSelectRow[];

  return linhas.map((p): PedidoAprovacaoRow => ({
    id: p.id,
    numero: p.numero,
    obra: nomeDaRelacao(p.obra) ?? "Sem obra",
    fornecedor: nomeDaRelacao(p.fornecedor) ?? "—",
    dias_aberto: diasEntre(p.criado_em.slice(0, 10), hojeISO),
  }));
}

type SolicitacaoAprovacaoSelectRow = {
  id: string;
  numero: string;
  criado_em: string;
  obra: NomeRelacao;
  solicitante: NomeRelacao;
};

async function buscarSolicitacoesAprovacaoDetalhe(admin: SupabaseClient, hojeISO: string): Promise<SolicitacaoAprovacaoRow[]> {
  const { data } = await admin
    .from("solicitacoes_compra")
    .select("id, numero, criado_em, obra:obras(nome), solicitante:usuarios!solicitante_id(nome)")
    .in("status", ["ABERTA", "AGUARDANDO_APROVACAO"])
    .order("criado_em", { ascending: true });

  const linhas = (data ?? []) as unknown as SolicitacaoAprovacaoSelectRow[];

  return linhas.map((s): SolicitacaoAprovacaoRow => ({
    id: s.id,
    numero: s.numero,
    obra: nomeDaRelacao(s.obra) ?? "Sem obra",
    solicitante: nomeDaRelacao(s.solicitante) ?? "—",
    dias_aberto: diasEntre(s.criado_em.slice(0, 10), hojeISO),
  }));
}

type PedidoEntregaSelectRow = {
  id: string;
  numero: string;
  prazo_entrega: string | null;
  obra: NomeRelacao;
  fornecedor: NomeRelacao;
};

async function buscarPedidosEmEntrega(admin: SupabaseClient, hojeISO: string): Promise<PedidoEntregaRow[]> {
  const { data } = await admin
    .from("pedidos_compra")
    .select("id, numero, prazo_entrega, obra:obras(nome), fornecedor:fornecedores(nome)")
    .eq("status", "AGUARDANDO_RECEBIMENTO")
    .or(`prazo_entrega.is.null,prazo_entrega.gte.${hojeISO}`)
    .order("prazo_entrega", { ascending: true, nullsFirst: false });

  const linhas = (data ?? []) as unknown as PedidoEntregaSelectRow[];

  return linhas.map((p): PedidoEntregaRow => ({
    id: p.id,
    numero: p.numero,
    obra: nomeDaRelacao(p.obra) ?? "Sem obra",
    fornecedor: nomeDaRelacao(p.fornecedor) ?? "—",
    prazo_entrega: p.prazo_entrega,
    dias_restantes: p.prazo_entrega ? diasAte(p.prazo_entrega.slice(0, 10), hojeISO) : null,
  }));
}

type PedidoPrazoSelectRow = {
  id: string;
  numero: string;
  prazo_entrega: string;
  obra: NomeRelacao;
  fornecedor: NomeRelacao;
};

async function buscarPedidosPrazoVencido(admin: SupabaseClient, hojeISO: string): Promise<PedidoPrazoRow[]> {
  const { data } = await admin
    .from("pedidos_compra")
    .select("id, numero, prazo_entrega, obra:obras(nome), fornecedor:fornecedores(nome)")
    .eq("status", "AGUARDANDO_RECEBIMENTO")
    .lt("prazo_entrega", hojeISO)
    .order("prazo_entrega", { ascending: true });

  const linhas = (data ?? []) as unknown as PedidoPrazoSelectRow[];

  return linhas.map((p): PedidoPrazoRow => ({
    id: p.id,
    numero: p.numero,
    obra: nomeDaRelacao(p.obra) ?? "Sem obra",
    fornecedor: nomeDaRelacao(p.fornecedor) ?? "—",
    prazo_entrega: p.prazo_entrega,
    dias_atraso: diasEntre(p.prazo_entrega.slice(0, 10), hojeISO),
  }));
}

const LABEL_STATUS_PEDIDO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguard. aprovação",
  REJEITADO: "Rejeitado",
  APROVADO: "Aprovado",
  EMITIDO: "Emitido",
  AGUARDANDO_RECEBIMENTO: "Aguard. recebimento",
  RECEBIDO_PARCIAL: "Recebido parcial",
  RECEBIDO: "Recebido",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const LABEL_STATUS_SOLICITACAO: Record<string, string> = {
  ABERTA: "Aberta",
  AGUARDANDO_APROVACAO: "Aguard. aprovação",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
  EM_PEDIDO: "Em pedido",
};

function contarPorStatus(rows: { status: string }[], labels: Record<string, string>): StatusCount[] {
  const contagem: Record<string, number> = {};
  for (const row of rows) contagem[row.status] = (contagem[row.status] ?? 0) + 1;
  return Object.entries(contagem)
    .map(([status, total]) => ({ status, label: labels[status] ?? status, total }))
    .sort((a, b) => b.total - a.total);
}

async function buscarStatusPedidos(admin: SupabaseClient): Promise<StatusCount[]> {
  const { data } = await admin.from("pedidos_compra").select("status");
  return contarPorStatus(data ?? [], LABEL_STATUS_PEDIDO);
}

async function buscarStatusSolicitacoes(admin: SupabaseClient): Promise<StatusCount[]> {
  const { data } = await admin.from("solicitacoes_compra").select("status");
  return contarPorStatus(data ?? [], LABEL_STATUS_SOLICITACAO);
}

function ultimosNDias(hojeISO: string, n: number): string[] {
  const base = new Date(`${hojeISO}T00:00:00Z`);
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dia = new Date(base);
    dia.setUTCDate(base.getUTCDate() - i);
    dias.push(dia.toISOString().slice(0, 10));
  }
  return dias;
}

async function buscarTendenciaCriacao(admin: SupabaseClient, hojeISO: string): Promise<TendenciaPonto[]> {
  const dias = ultimosNDias(hojeISO, 14);
  const inicio = dias[0];

  const [{ data: pedidos }, { data: solicitacoes }] = await Promise.all([
    admin.from("pedidos_compra").select("criado_em").gte("criado_em", inicio),
    admin.from("solicitacoes_compra").select("criado_em").gte("criado_em", inicio),
  ]);

  const porDiaPedidos: Record<string, number> = {};
  for (const p of pedidos ?? []) {
    const dia = p.criado_em.slice(0, 10);
    porDiaPedidos[dia] = (porDiaPedidos[dia] ?? 0) + 1;
  }
  const porDiaSolicitacoes: Record<string, number> = {};
  for (const s of solicitacoes ?? []) {
    const dia = s.criado_em.slice(0, 10);
    porDiaSolicitacoes[dia] = (porDiaSolicitacoes[dia] ?? 0) + 1;
  }

  return dias.map((dia) => ({
    data: dia,
    pedidos: porDiaPedidos[dia] ?? 0,
    solicitacoes: porDiaSolicitacoes[dia] ?? 0,
  }));
}

async function buscarKpis(
  pedidosAprovacao: PedidoAprovacaoRow[],
  solicitacoesAprovacao: SolicitacaoAprovacaoRow[],
  pedidosEmEntrega: PedidoEntregaRow[],
  pedidosAtrasados: PedidoPrazoRow[],
): Promise<CobrancaKpis> {
  return {
    pedidosAguardandoAprovacao: pedidosAprovacao.length,
    solicitacoesAguardandoAprovacao: solicitacoesAprovacao.length,
    pedidosEmEntrega: pedidosEmEntrega.length,
    pedidosPrazoVencido: pedidosAtrasados.length,
  };
}

export async function buscarRelatorioCobranca(admin: SupabaseClient) {
  const hojeISO = hojeSaoPaulo();

  const [
    pedidosAprovacao,
    solicitacoesAprovacao,
    pedidosEmEntrega,
    pedidosAtrasados,
    statusPedidos,
    statusSolicitacoes,
    tendencia,
  ] = await Promise.all([
    buscarPedidosAprovacaoDetalhe(admin, hojeISO),
    buscarSolicitacoesAprovacaoDetalhe(admin, hojeISO),
    buscarPedidosEmEntrega(admin, hojeISO),
    buscarPedidosPrazoVencido(admin, hojeISO),
    buscarStatusPedidos(admin),
    buscarStatusSolicitacoes(admin),
    buscarTendenciaCriacao(admin, hojeISO),
  ]);

  const kpis = await buscarKpis(pedidosAprovacao, solicitacoesAprovacao, pedidosEmEntrega, pedidosAtrasados);

  return {
    kpis,
    pedidosAprovacao,
    solicitacoesAprovacao,
    pedidosEmEntrega,
    pedidosAtrasados,
    statusPedidos,
    statusSolicitacoes,
    tendencia,
  };
}
