import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_PED_LABEL, type StatusPedido } from "@/modules/squadframe/types/compras";
import { hojeSaoPaulo } from "@/modules/squadframe/services/cobranca/executar-cobranca";

export interface FiltrosRelatorioPedidos {
  // Ausentes = sem recorte de período (relatório "por obra": traz o total
  // histórico daquela obra, sem escolher tempo).
  dataInicio?: string; // "YYYY-MM-DD"
  dataFim?: string;    // "YYYY-MM-DD"
  obraId?: string;
  fornecedorId?: string;
  status?: StatusPedido;
}

export interface PedidoLinha {
  id: string;
  numero: string;
  obra: string;
  fornecedor: string;
  status: StatusPedido;
  valor: number;
  criadoEm: string;
  prazoEntrega: string | null;
  diasAtraso: number | null; // só preenchido quando o pedido está atrasado
}

interface GrupoContagem {
  chave: string;
  quantidade: number;
  valor: number;
}

export interface GrupoObra {
  obra: string;
  quantidade: number;
  valor: number;
  pedidos: PedidoLinha[];
}

export interface RelatorioPedidosData {
  periodoLabel: string;
  totais: { quantidade: number; valorTotal: number };
  variacaoPercentual: number | null; // vs. período anterior de mesma duração
  porStatus: GrupoContagem[];
  porObra: GrupoContagem[];
  porMes: GrupoContagem[];
  narrativa: string[];
  atrasados: PedidoLinha[];
  aguardandoRecebimento: PedidoLinha[];
  pedidosPorObra: GrupoObra[];
  pedidos: PedidoLinha[];
}

type PedidoRow = {
  id: string;
  numero: string;
  status: StatusPedido;
  criado_em: string;
  valor_final: number | null;
  prazo_entrega: string | null;
  obra: { nome: string } | { nome: string }[] | null;
  fornecedor: { nome: string } | { nome: string }[] | null;
};

// Mesmos status "em trânsito" usados no cálculo de atraso do relatório diário
// (executar-cobranca.ts / executar-relatorio-diario.ts) — pedido emitido,
// aguardando o fornecedor entregar.
const STATUS_AGUARDANDO_ENTREGA: StatusPedido = "AGUARDANDO_RECEBIMENTO";

function nomeDaRelacao(v: { nome: string } | { nome: string }[] | null): string {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? "—";
}

function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00-03:00`).toLocaleDateString("pt-BR");
}

function formatarMoeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesLabelDe(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function diasEntreDatas(dataISO: string, hojeISO: string): number {
  const diffMs = new Date(`${hojeISO}T00:00:00Z`).getTime() - new Date(`${dataISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

async function buscarPedidosNoPeriodo(
  admin: SupabaseClient,
  filtros: FiltrosRelatorioPedidos,
): Promise<PedidoRow[]> {
  let q = admin
    .from("pedidos_compra")
    .select(`
      id, numero, status, criado_em, valor_final, prazo_entrega,
      obra:obras(nome),
      fornecedor:fornecedores(nome)
    `);

  if (filtros.dataInicio) q = q.gte("criado_em", `${filtros.dataInicio}T00:00:00-03:00`);
  if (filtros.dataFim) q = q.lt("criado_em", `${filtros.dataFim}T23:59:59-03:00`);
  if (filtros.obraId) q = q.eq("obra_id", filtros.obraId);
  if (filtros.fornecedorId) q = q.eq("fornecedor_id", filtros.fornecedorId);
  if (filtros.status) q = q.eq("status", filtros.status);

  const { data } = await q.order("criado_em", { ascending: false }).limit(2000);
  return (data ?? []) as unknown as PedidoRow[];
}

async function resolverValoresEfetivos(
  admin: SupabaseClient,
  pedidos: PedidoRow[],
): Promise<Map<string, number>> {
  const valores = new Map<string, number>();
  const semValorFinal = pedidos.filter((p) => p.valor_final == null).map((p) => p.id);

  const estimados: Record<string, number> = {};
  if (semValorFinal.length > 0) {
    const { data: itens } = await admin
      .from("pedido_itens")
      .select("pedido_id, preco_unitario, quantidade_pedida")
      .in("pedido_id", semValorFinal);
    for (const it of itens ?? []) {
      const total = (it.preco_unitario ?? 0) * (it.quantidade_pedida ?? 0);
      estimados[it.pedido_id] = (estimados[it.pedido_id] ?? 0) + total;
    }
  }

  for (const p of pedidos) valores.set(p.id, p.valor_final ?? estimados[p.id] ?? 0);
  return valores;
}

function agrupar(pedidos: PedidoLinha[], chaveDe: (p: PedidoLinha) => string): GrupoContagem[] {
  const mapa = new Map<string, GrupoContagem>();
  for (const p of pedidos) {
    const chave = chaveDe(p);
    if (!mapa.has(chave)) mapa.set(chave, { chave, quantidade: 0, valor: 0 });
    const g = mapa.get(chave)!;
    g.quantidade++;
    g.valor += p.valor;
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

function agruparPorObra(pedidos: PedidoLinha[]): GrupoObra[] {
  const mapa = new Map<string, GrupoObra>();
  for (const p of pedidos) {
    if (!mapa.has(p.obra)) mapa.set(p.obra, { obra: p.obra, quantidade: 0, valor: 0, pedidos: [] });
    const g = mapa.get(p.obra)!;
    g.quantidade++;
    g.valor += p.valor;
    g.pedidos.push(p);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

function diasEntre(inicioISO: string, fimISO: string): number {
  const ms = new Date(`${fimISO}T00:00:00Z`).getTime() - new Date(`${inicioISO}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function montarNarrativa(
  periodoLabel: string,
  temPeriodo: boolean,
  totais: RelatorioPedidosData["totais"],
  porStatus: GrupoContagem[],
  variacaoPercentual: number | null,
  atrasados: PedidoLinha[],
  aguardandoRecebimento: PedidoLinha[],
): string[] {
  const blocos: string[] = [];
  const escopo = temPeriodo ? `no período de ${periodoLabel}` : "no histórico";

  if (totais.quantidade === 0) {
    blocos.push(`Nenhum pedido de compra foi registrado ${escopo}.`);
    return blocos;
  }

  blocos.push(
    `Considerando ${escopo}, o sistema registrou ${totais.quantidade} pedido${totais.quantidade !== 1 ? "s" : ""} de compra, totalizando ${formatarMoeda(totais.valorTotal)}.`,
  );

  if (variacaoPercentual != null) {
    const direcao = variacaoPercentual >= 0 ? "alta" : "queda";
    blocos.push(
      `Isso representa uma ${direcao} de ${Math.abs(variacaoPercentual).toFixed(1)}% em relação ao período anterior de mesma duração.`,
    );
  }

  const statusPorLabel = (chave: string) => STATUS_PED_LABEL[chave as StatusPedido] ?? chave;
  const resumoStatus = porStatus
    .filter((g) => g.quantidade > 0)
    .map((g) => `${g.quantidade} ${statusPorLabel(g.chave).toLowerCase()}`)
    .join(", ");
  if (resumoStatus) blocos.push(`Distribuição por status: ${resumoStatus}.`);

  if (atrasados.length > 0) {
    blocos.push(
      `${atrasados.length} pedido${atrasados.length !== 1 ? "s" : ""} está${atrasados.length !== 1 ? "ão" : ""} com entrega atrasada — detalhes na seção "Pedidos atrasados" abaixo.`,
    );
  }
  if (aguardandoRecebimento.length > 0) {
    blocos.push(
      `${aguardandoRecebimento.length} pedido${aguardandoRecebimento.length !== 1 ? "s" : ""} aguarda${aguardandoRecebimento.length !== 1 ? "m" : ""} recebimento dentro do prazo.`,
    );
  }

  return blocos;
}

export async function gerarRelatorioPedidos(
  admin: SupabaseClient,
  filtros: FiltrosRelatorioPedidos,
): Promise<RelatorioPedidosData> {
  const rows = await buscarPedidosNoPeriodo(admin, filtros);
  const valores = await resolverValoresEfetivos(admin, rows);
  const hojeISO = hojeSaoPaulo();

  const pedidos: PedidoLinha[] = rows.map((r) => {
    const atrasado =
      r.status === STATUS_AGUARDANDO_ENTREGA && !!r.prazo_entrega && r.prazo_entrega.slice(0, 10) < hojeISO;
    return {
      id: r.id,
      numero: r.numero,
      obra: nomeDaRelacao(r.obra),
      fornecedor: nomeDaRelacao(r.fornecedor),
      status: r.status,
      valor: valores.get(r.id) ?? 0,
      criadoEm: r.criado_em,
      prazoEntrega: r.prazo_entrega,
      diasAtraso: atrasado ? diasEntreDatas(r.prazo_entrega!.slice(0, 10), hojeISO) : null,
    };
  });

  const totais = {
    quantidade: pedidos.length,
    valorTotal: pedidos.reduce((s, p) => s + p.valor, 0),
  };

  const porStatus = agrupar(pedidos, (p) => p.status);
  const porObra = agrupar(pedidos, (p) => p.obra);
  const porMes = agrupar(pedidos, (p) => mesLabelDe(p.criadoEm)).sort((a, b) => a.chave.localeCompare(b.chave, "pt-BR"));

  const atrasados = pedidos
    .filter((p) => p.diasAtraso != null)
    .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));

  const aguardandoRecebimento = pedidos
    .filter((p) => p.status === STATUS_AGUARDANDO_ENTREGA && p.diasAtraso == null)
    .sort((a, b) => (a.prazoEntrega ?? "9999").localeCompare(b.prazoEntrega ?? "9999"));

  const pedidosPorObra = agruparPorObra(pedidos);

  // Comparação com o "período anterior de mesma duração" só faz sentido
  // quando existe um período — o relatório por obra (sem data) traz o total
  // histórico, não tem com o que comparar.
  let variacaoPercentual: number | null = null;
  if (filtros.dataInicio && filtros.dataFim && totais.quantidade > 0) {
    const dias = diasEntre(filtros.dataInicio, filtros.dataFim);
    const fimAnterior = new Date(`${filtros.dataInicio}T00:00:00Z`);
    fimAnterior.setUTCDate(fimAnterior.getUTCDate() - 1);
    const inicioAnterior = new Date(fimAnterior);
    inicioAnterior.setUTCDate(inicioAnterior.getUTCDate() - (dias - 1));

    const rowsAnterior = await buscarPedidosNoPeriodo(admin, {
      ...filtros,
      dataInicio: inicioAnterior.toISOString().slice(0, 10),
      dataFim: fimAnterior.toISOString().slice(0, 10),
    });
    if (rowsAnterior.length > 0) {
      const valoresAnterior = await resolverValoresEfetivos(admin, rowsAnterior);
      const totalAnterior = rowsAnterior.reduce((s, r) => s + (valoresAnterior.get(r.id) ?? 0), 0);
      if (totalAnterior > 0) {
        variacaoPercentual = ((totais.valorTotal - totalAnterior) / totalAnterior) * 100;
      }
    }
  }

  const periodoLabel =
    filtros.dataInicio && filtros.dataFim
      ? `${formatarData(filtros.dataInicio)} a ${formatarData(filtros.dataFim)}`
      : "Total histórico";
  const narrativa = montarNarrativa(
    periodoLabel,
    !!(filtros.dataInicio && filtros.dataFim),
    totais,
    porStatus,
    variacaoPercentual,
    atrasados,
    aguardandoRecebimento,
  );

  return {
    periodoLabel,
    totais,
    variacaoPercentual,
    porStatus,
    porObra,
    porMes,
    narrativa,
    atrasados,
    aguardandoRecebimento,
    pedidosPorObra,
    pedidos,
  };
}
