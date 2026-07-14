import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsappMessage, type WhatsappCta } from "@/shared/providers/whatsapp/twilio";
import { resolverUsuariosComPermissao } from "../cobranca/resolver-destinatarios";
import { hojeSaoPaulo } from "../cobranca/executar-cobranca";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://squadframe.vercel.app";

// Template de botão CTA aprovado na Meta — opcional. Sem ele, a mensagem cai
// de volta pro texto livre com o link do dashboard embutido (mesmo
// comportamento do CTA_PEDIDO_SID em executar-cobranca.ts).
const CTA_RELATORIO_SID = process.env.TWILIO_CONTENT_SID_RELATORIO_DIARIO;

// Máximo de pedidos atrasados listados por obra — evita mensagem gigante em
// obra com muito atraso acumulado; o resto vira "e mais N".
const MAX_ATRASADOS_POR_OBRA = 8;

// Label é função da contagem pra concordância correta ("1 pedido criado" x
// "2 pedidos criados") — frases preposicionadas (ex: "para aprovar") não
// variam, mas os particípios (criado, aprovado...) precisam do plural.
const LABEL_PEDIDO: Record<string, (n: number) => string> = {
  CRIADO: (n) => `criado${n !== 1 ? "s" : ""}`,
  STATUS_AGUARDANDO_APROVACAO: () => "para aprovar",
  STATUS_APROVADO: (n) => `aprovado${n !== 1 ? "s" : ""}`,
  STATUS_EMITIDO: (n) => `emitido${n !== 1 ? "s" : ""}`,
  STATUS_CANCELADO: (n) => `cancelado${n !== 1 ? "s" : ""}`,
  STATUS_RECEBIDO_PARCIAL: (n) => `recebido${n !== 1 ? "s" : ""} parcialmente`,
  STATUS_RECEBIDO: (n) => `recebido${n !== 1 ? "s" : ""} integralmente`,
  EDITADO: (n) => `editado${n !== 1 ? "s" : ""}`,
  RECEBIMENTO_REGISTRADO: () => "com recebimento registrado",
  VALOR_FINAL_REGISTRADO: () => "com valor final registrado",
  PRAZO_ENTREGA_ATUALIZADO: () => "com prazo de entrega atualizado",
  EXCLUIDO: (n) => `excluído${n !== 1 ? "s" : ""}`,
};

const LABEL_SOLICITACAO: Record<string, (n: number) => string> = {
  CRIADA: (n) => `criada${n !== 1 ? "s" : ""}`,
  STATUS_AGUARDANDO_APROVACAO: () => "para aprovar",
  STATUS_APROVADA: (n) => `aprovada${n !== 1 ? "s" : ""}`,
  STATUS_REJEITADA: (n) => `rejeitada${n !== 1 ? "s" : ""}`,
  STATUS_CANCELADA: (n) => `cancelada${n !== 1 ? "s" : ""}`,
  EXCLUIDO: (n) => `excluída${n !== 1 ? "s" : ""}`,
};

// PostgREST não expõe a cardinalidade real do join pro tipo genérico
// SupabaseClient (uma FK simples sempre volta 1 objeto, mas o tipo inferido
// permite array) — *Raw modela o shape real da resposta pra normalizar sem `any`.
type NomeRelacao = { nome: string } | { nome: string }[] | null;

function nomeDaRelacao(v: NomeRelacao): string | null {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? null;
}

function diasEntre(dataISO: string, hojeISO: string): number {
  const diffMs = new Date(`${hojeISO}T00:00:00Z`).getTime() - new Date(`${dataISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function proximoDiaISO(hojeISO: string): string {
  const d = new Date(`${hojeISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface ItemDetalhe {
  numero: string;
  obra: string;
}

interface HistoricoRow {
  entidade: string;
  entidade_id: string;
  acao: string;
}

type DetalheSelectRow = { id: string; numero: string; obra: NomeRelacao };

async function buscarDetalhes(
  admin: SupabaseClient,
  tabela: "pedidos_compra" | "solicitacoes_compra",
  ids: string[],
): Promise<Map<string, ItemDetalhe>> {
  const mapa = new Map<string, ItemDetalhe>();
  if (!ids.length) return mapa;

  const { data } = await admin.from(tabela).select("id, numero, obra:obras(nome)").in("id", ids);
  for (const row of (data ?? []) as unknown as DetalheSelectRow[]) {
    mapa.set(row.id, { numero: row.numero, obra: nomeDaRelacao(row.obra) ?? "Sem obra" });
  }
  return mapa;
}

// ── Movimentação do dia, agrupada por obra ──────────────────────────────
// Em vez de listar "pedido X" repetido em cada etapa por onde ele passou no
// dia (criado → para aprovar → aprovado), agrupa por obra e mostra só a
// contagem por etapa — mais compacto e sem repetição do mesmo número.

interface ContagemObra {
  obra: string;
  pedidos: Map<string, number>; // acao -> contagem
  solicitacoes: Map<string, number>;
}

function agruparPorObra(
  historico: HistoricoRow[],
  detalhesPedido: Map<string, ItemDetalhe>,
  detalhesSolicitacao: Map<string, ItemDetalhe>,
): ContagemObra[] {
  const porObra = new Map<string, ContagemObra>();

  function contar(obra: string, campo: "pedidos" | "solicitacoes", acao: string) {
    if (!porObra.has(obra)) porObra.set(obra, { obra, pedidos: new Map(), solicitacoes: new Map() });
    const bucket = porObra.get(obra)![campo];
    bucket.set(acao, (bucket.get(acao) ?? 0) + 1);
  }

  for (const row of historico) {
    if (row.entidade === "pedido") {
      const item = detalhesPedido.get(row.entidade_id);
      if (item) contar(item.obra, "pedidos", row.acao);
    } else if (row.entidade === "solicitacao") {
      const item = detalhesSolicitacao.get(row.entidade_id);
      if (item) contar(item.obra, "solicitacoes", row.acao);
    }
  }

  return [...porObra.values()].sort((a, b) => a.obra.localeCompare(b.obra, "pt-BR"));
}

function formatarContagemObra(grupo: ContagemObra): string {
  const linhas: string[] = [`*${grupo.obra}*`];

  for (const [acao, label] of Object.entries(LABEL_PEDIDO)) {
    const n = grupo.pedidos.get(acao);
    if (n) linhas.push(`${n} pedido${n !== 1 ? "s" : ""} ${label(n)}`);
  }
  for (const [acao, label] of Object.entries(LABEL_SOLICITACAO)) {
    const n = grupo.solicitacoes.get(acao);
    if (n) linhas.push(`${n} solicitaç${n !== 1 ? "ões" : "ão"} ${label(n)}`);
  }

  return linhas.join("\n");
}

// ── Pedidos atrasados, agrupados por obra ───────────────────────────────

interface PedidoAtrasado {
  numero: string;
  diasAtraso: number;
}

interface AtrasoObra {
  obra: string;
  itens: PedidoAtrasado[];
}

type AtrasoSelectRow = { numero: string; prazo_entrega: string; obra: NomeRelacao };

async function buscarAtrasadosPorObra(admin: SupabaseClient, hojeISO: string): Promise<AtrasoObra[]> {
  const { data } = await admin
    .from("pedidos_compra")
    .select("numero, prazo_entrega, obra:obras(nome)")
    .eq("status", "AGUARDANDO_RECEBIMENTO")
    .lt("prazo_entrega", hojeISO)
    .order("prazo_entrega", { ascending: true });

  const porObra = new Map<string, PedidoAtrasado[]>();
  for (const row of (data ?? []) as unknown as AtrasoSelectRow[]) {
    const obra = nomeDaRelacao(row.obra) ?? "Sem obra";
    if (!porObra.has(obra)) porObra.set(obra, []);
    porObra.get(obra)!.push({
      numero: row.numero,
      diasAtraso: diasEntre(row.prazo_entrega.slice(0, 10), hojeISO),
    });
  }

  return [...porObra.entries()]
    .map(([obra, itens]) => ({ obra, itens }))
    .sort((a, b) => a.obra.localeCompare(b.obra, "pt-BR"));
}

function formatarAtrasoObra(grupo: AtrasoObra): string {
  const total = grupo.itens.length;
  const visiveis = grupo.itens.slice(0, MAX_ATRASADOS_POR_OBRA);
  const linhas = visiveis.map((i) => `- ${i.numero} — ${i.diasAtraso}d de atraso`);
  if (total > MAX_ATRASADOS_POR_OBRA) linhas.push(`- e mais ${total - MAX_ATRASADOS_POR_OBRA}`);
  return [`*${grupo.obra}* — ${total} pedido${total !== 1 ? "s" : ""} atrasado${total !== 1 ? "s" : ""}`, ...linhas].join("\n");
}

function montarMensagem(
  hojeISO: string,
  contagemPorObra: ContagemObra[],
  atrasadosPorObra: AtrasoObra[],
): string {
  const dataLabel = new Date(`${hojeISO}T00:00:00-03:00`).toLocaleDateString("pt-BR");

  const blocos = [`*📊 Resumo de Compras — ${dataLabel}*`];

  if (contagemPorObra.length) {
    for (const grupo of contagemPorObra) blocos.push(formatarContagemObra(grupo));
  } else {
    blocos.push("Nenhuma movimentação registrada hoje.");
  }

  if (atrasadosPorObra.length) {
    blocos.push("_🚨 Pedidos atrasados_");
    for (const grupo of atrasadosPorObra) blocos.push(formatarAtrasoObra(grupo));
  }

  // Com o template CTA aprovado, o link vira botão "Ver Dashboard" — não
  // precisa repetir a URL no corpo do texto. Sem o template, cai no texto
  // livre com o link embutido.
  if (!CTA_RELATORIO_SID) blocos.push(`Acesse: ${APP_URL}/squadframe?aba=cobranca`);

  return blocos.join("\n\n");
}

interface ResultadoRelatorioDiario {
  destinatarios: number;
  enviados: number;
  erros: number;
}

export async function executarRelatorioDiario(admin: SupabaseClient): Promise<ResultadoRelatorioDiario> {
  const hojeISO = hojeSaoPaulo();
  const amanhaISO = proximoDiaISO(hojeISO);

  const resultado: ResultadoRelatorioDiario = { destinatarios: 0, enviados: 0, erros: 0 };

  const [{ data }, atrasadosPorObra] = await Promise.all([
    admin
      .from("compra_historico")
      .select("entidade, entidade_id, acao")
      .gte("criado_em", `${hojeISO}T00:00:00-03:00`)
      .lt("criado_em", `${amanhaISO}T00:00:00-03:00`)
      .in("entidade", ["pedido", "solicitacao"]),
    buscarAtrasadosPorObra(admin, hojeISO),
  ]);

  const historico = (data ?? []) as HistoricoRow[];
  const idsPedido = [...new Set(historico.filter((r) => r.entidade === "pedido").map((r) => r.entidade_id))];
  const idsSolicitacao = [...new Set(historico.filter((r) => r.entidade === "solicitacao").map((r) => r.entidade_id))];

  const [detalhesPedido, detalhesSolicitacao] = await Promise.all([
    buscarDetalhes(admin, "pedidos_compra", idsPedido),
    buscarDetalhes(admin, "solicitacoes_compra", idsSolicitacao),
  ]);

  const contagemPorObra = agruparPorObra(historico, detalhesPedido, detalhesSolicitacao);

  const mensagem = montarMensagem(hojeISO, contagemPorObra, atrasadosPorObra);
  const cta: WhatsappCta | undefined = CTA_RELATORIO_SID ? { contentSid: CTA_RELATORIO_SID } : undefined;

  const destinatarios = await resolverUsuariosComPermissao(admin, PERMISSIONS.COMPRAS_NOTIFICACAO_RELATORIO_DIARIO);
  resultado.destinatarios = destinatarios.length;

  for (const dest of destinatarios) {
    if (!dest.whatsapp) continue;

    // Reserva a linha antes de enviar — se já existe (mesmo usuário + mesmo
    // dia), pula. Evita reenvio duplicado se o cron rodar mais de uma vez.
    const { data: reserva, error: reservaErro } = await admin
      .from("relatorio_diario_log")
      .insert({
        usuario_id: dest.id,
        destino: dest.whatsapp,
        data_referencia: hojeISO,
        mensagem,
        sucesso: false,
      })
      .select("id")
      .single();

    if (reservaErro || !reserva) continue;

    const envio = await sendWhatsappMessage(dest.whatsapp, mensagem, cta);

    await admin
      .from("relatorio_diario_log")
      .update({ sucesso: envio.ok, erro: envio.error ?? null })
      .eq("id", reserva.id);

    if (envio.ok) resultado.enviados++;
    else resultado.erros++;
  }

  return resultado;
}
