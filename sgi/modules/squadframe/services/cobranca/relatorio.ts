import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeSaoPaulo } from "./executar-cobranca";
import type { CobrancaKpis, DiaAgregado, ItemMaisCobrado, LogRow, PedidoPrazoRow } from "../../components/cobranca/cobranca-dashboard";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function diasEntre(dataISO: string, hojeISO: string): number {
  const diffMs = new Date(`${hojeISO}T00:00:00Z`).getTime() - new Date(`${dataISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function primeiroDiaSemana(hojeISO: string): string {
  const d = new Date(`${hojeISO}T00:00:00Z`);
  const diaSemana = d.getUTCDay(); // 0=dom
  const offset = diaSemana === 0 ? 6 : diaSemana - 1; // volta até segunda
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function primeiroDiaMes(hojeISO: string): string {
  return `${hojeISO.slice(0, 7)}-01`;
}

async function buscarKpis(admin: SupabaseClient, hojeISO: string): Promise<CobrancaKpis> {
  const [{ data: pedidos }, { data: solicitacoes }, { data: cobrancasHoje }, { data: pedidosVencidos }] =
    await Promise.all([
      admin.from("pedidos_compra").select("criado_em").eq("status", "AGUARDANDO_APROVACAO"),
      admin.from("solicitacoes_compra").select("criado_em").eq("status", "AGUARDANDO_APROVACAO"),
      admin.from("cobranca_log").select("sucesso").eq("data_referencia", hojeISO),
      admin.from("pedidos_compra").select("id").eq("status", "AGUARDANDO_RECEBIMENTO").lt("prazo_entrega", hojeISO),
    ]);

  const mediaDias = (rows: { criado_em: string }[]) =>
    rows.length ? Math.round(rows.reduce((s, r) => s + diasEntre(r.criado_em.slice(0, 10), hojeISO), 0) / rows.length) : 0;

  return {
    pedidosAguardandoAprovacao: pedidos?.length ?? 0,
    pedidosDiasMedio: mediaDias(pedidos ?? []),
    solicitacoesAguardandoAprovacao: solicitacoes?.length ?? 0,
    solicitacoesDiasMedio: mediaDias(solicitacoes ?? []),
    cobrancasHojeSucesso: (cobrancasHoje ?? []).filter((c) => c.sucesso).length,
    cobrancasHojeErro: (cobrancasHoje ?? []).filter((c) => !c.sucesso).length,
    pedidosPrazoVencido: pedidosVencidos?.length ?? 0,
  };
}

// PostgREST não expõe a cardinalidade real do join pro tipo genérico
// SupabaseClient (uma FK simples sempre volta 1 objeto, mas o tipo inferido
// permite array) — *Raw modela o shape real da resposta pra normalizar sem `any`.
type NomeRelacao = { nome: string } | { nome: string }[] | null;
type PedidoPrazoSelectRow = {
  id: string;
  numero: string;
  prazo_entrega: string;
  obra: NomeRelacao;
  fornecedor: NomeRelacao;
};

function nomeDaRelacao(v: NomeRelacao): string | null {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? null;
}

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

async function buscarLogsDiario(admin: SupabaseClient, hojeISO: string): Promise<LogRow[]> {
  const { data } = await admin
    .from("cobranca_log")
    .select("id, entidade, destino_tipo, mensagem, sucesso, enviado_em")
    .eq("data_referencia", hojeISO)
    .order("enviado_em", { ascending: false });
  return (data ?? []) as LogRow[];
}

async function buscarPorDiaSemanal(admin: SupabaseClient, hojeISO: string): Promise<DiaAgregado[]> {
  const inicio = primeiroDiaSemana(hojeISO);
  const { data } = await admin
    .from("cobranca_log")
    .select("data_referencia, sucesso")
    .gte("data_referencia", inicio)
    .lte("data_referencia", hojeISO);

  const porDia: Record<string, { total: number; sucesso: number }> = {};
  for (const row of data ?? []) {
    if (!porDia[row.data_referencia]) porDia[row.data_referencia] = { total: 0, sucesso: 0 };
    porDia[row.data_referencia].total++;
    if (row.sucesso) porDia[row.data_referencia].sucesso++;
  }

  const dias: DiaAgregado[] = [];
  const d = new Date(`${inicio}T00:00:00Z`);
  for (let i = 0; i < 5; i++) {
    const iso = d.toISOString().slice(0, 10);
    const agregado = porDia[iso] ?? { total: 0, sucesso: 0 };
    dias.push({ label: DIAS_SEMANA[d.getUTCDay()], total: agregado.total, sucesso: agregado.sucesso });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}

async function buscarPorSemanaMensal(admin: SupabaseClient, hojeISO: string): Promise<DiaAgregado[]> {
  const inicio = primeiroDiaMes(hojeISO);
  const { data } = await admin
    .from("cobranca_log")
    .select("data_referencia, sucesso")
    .gte("data_referencia", inicio)
    .lte("data_referencia", hojeISO);

  const inicioDate = new Date(`${inicio}T00:00:00Z`);
  const porSemana: Record<number, { total: number; sucesso: number }> = {};
  for (const row of data ?? []) {
    const diff = Math.floor(
      (new Date(`${row.data_referencia}T00:00:00Z`).getTime() - inicioDate.getTime()) / 86_400_000,
    );
    const semana = Math.floor(diff / 7);
    if (!porSemana[semana]) porSemana[semana] = { total: 0, sucesso: 0 };
    porSemana[semana].total++;
    if (row.sucesso) porSemana[semana].sucesso++;
  }

  return Object.keys(porSemana)
    .map(Number)
    .sort((a, b) => a - b)
    .map((semana) => ({
      label: `Semana ${semana + 1}`,
      total: porSemana[semana].total,
      sucesso: porSemana[semana].sucesso,
    }));
}

async function buscarMaisCobrados(admin: SupabaseClient, hojeISO: string): Promise<ItemMaisCobrado[]> {
  const inicio = primeiroDiaMes(hojeISO);
  const { data } = await admin
    .from("cobranca_log")
    .select("entidade, entidade_id, data_referencia")
    .gte("data_referencia", inicio)
    .lte("data_referencia", hojeISO);

  const porItem: Record<string, { entidade: "pedido" | "solicitacao"; entidade_id: string; dias: Set<string> }> = {};
  for (const row of data ?? []) {
    const chave = `${row.entidade}:${row.entidade_id}`;
    if (!porItem[chave]) porItem[chave] = { entidade: row.entidade, entidade_id: row.entidade_id, dias: new Set() };
    porItem[chave].dias.add(row.data_referencia);
  }

  const ranking = Object.values(porItem)
    .map((r) => ({ entidade: r.entidade, entidade_id: r.entidade_id, dias_cobrados: r.dias.size }))
    .sort((a, b) => b.dias_cobrados - a.dias_cobrados)
    .slice(0, 10);

  if (!ranking.length) return [];

  const idsPedido = ranking.filter((r) => r.entidade === "pedido").map((r) => r.entidade_id);
  const idsSolicitacao = ranking.filter((r) => r.entidade === "solicitacao").map((r) => r.entidade_id);

  const [{ data: pedidos }, { data: solicitacoes }] = await Promise.all([
    idsPedido.length
      ? admin.from("pedidos_compra").select("id, numero").in("id", idsPedido)
      : Promise.resolve({ data: [] as { id: string; numero: string }[] }),
    idsSolicitacao.length
      ? admin.from("solicitacoes_compra").select("id, numero").in("id", idsSolicitacao)
      : Promise.resolve({ data: [] as { id: string; numero: string }[] }),
  ]);

  const numeroPorId = new Map<string, string>();
  for (const p of pedidos ?? []) numeroPorId.set(`pedido:${p.id}`, p.numero);
  for (const s of solicitacoes ?? []) numeroPorId.set(`solicitacao:${s.id}`, s.numero);

  return ranking.map((r) => ({
    entidade: r.entidade,
    entidade_id: r.entidade_id,
    numero: numeroPorId.get(`${r.entidade}:${r.entidade_id}`) ?? "—",
    dias_cobrados: r.dias_cobrados,
  }));
}

export async function buscarRelatorioCobranca(admin: SupabaseClient, periodo: "diario" | "semanal" | "mensal") {
  const hojeISO = hojeSaoPaulo();

  const [kpis, logsDiario, porDiaSemanal, porSemanaMensal, maisCobrados, pedidosPrazoDetalhe] = await Promise.all([
    buscarKpis(admin, hojeISO),
    periodo === "diario" ? buscarLogsDiario(admin, hojeISO) : Promise.resolve([]),
    periodo === "semanal" ? buscarPorDiaSemanal(admin, hojeISO) : Promise.resolve([]),
    periodo === "mensal" ? buscarPorSemanaMensal(admin, hojeISO) : Promise.resolve([]),
    periodo === "mensal" ? buscarMaisCobrados(admin, hojeISO) : Promise.resolve([]),
    buscarPedidosPrazoVencido(admin, hojeISO),
  ]);

  return { kpis, logsDiario, porDiaSemanal, porSemanaMensal, maisCobrados, pedidosPrazoDetalhe };
}
