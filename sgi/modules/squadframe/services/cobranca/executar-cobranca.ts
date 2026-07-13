import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsappMessage } from "@/shared/providers/whatsapp/twilio";
import {
  resolverDestinatariosPedido,
  resolverDestinatariosSolicitacao,
  type Destinatario,
} from "./resolver-destinatarios";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://squadframe.vercel.app";

export function hojeSaoPaulo(): string {
  // America/Sao_Paulo explícito — não depende do cron rodar sempre de manhã em UTC
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // "YYYY-MM-DD"
}

function diasEmAberto(criadoEm: string, hojeISO: string): number {
  const inicio = new Date(criadoEm);
  const hoje = new Date(`${hojeISO}T00:00:00`);
  const diffMs = hoje.getTime() - Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

interface ResultadoCobranca {
  pedidos_cobrados: number;
  solicitacoes_cobradas: number;
  mensagens_enviadas: number;
  erros: number;
}

async function enviarParaDestinatario(
  admin: SupabaseClient,
  params: {
    entidade: "pedido" | "solicitacao";
    entidadeId: string;
    numero: string;
    dataReferencia: string;
    destinatario: Destinatario;
    mensagem: string;
  },
): Promise<{ enviado: boolean; sucesso: boolean }> {
  const { entidade, entidadeId, numero, dataReferencia, destinatario, mensagem } = params;

  // Reserva a linha antes de enviar — se já existe (mesmo dia + mesmo destino), pula.
  const { data: reserva, error: reservaErro } = await admin
    .from("cobranca_log")
    .insert({
      entidade,
      entidade_id: entidadeId,
      tipo_cobranca: "aguardando_aprovacao",
      data_referencia: dataReferencia,
      destino_tipo: destinatario.tipo,
      destino: destinatario.destino,
      usuario_id: destinatario.usuario_id,
      mensagem,
      sucesso: false,
    })
    .select("id")
    .single();

  if (reservaErro || !reserva) {
    // Conflito de UNIQUE (já cobrado hoje para esse destino) ou outro erro — não envia.
    return { enviado: false, sucesso: false };
  }

  const resultado = await sendWhatsappMessage(destinatario.destino, mensagem);

  await admin
    .from("cobranca_log")
    .update({ sucesso: resultado.ok, erro: resultado.error ?? null })
    .eq("id", reserva.id);

  if (resultado.ok) {
    await admin.from("notificacoes").insert({
      usuario_id: destinatario.usuario_id,
      tipo: entidade === "pedido" ? "pedido_cobranca_prazo" : "solicitacao_cobranca_prazo",
      payload:
        entidade === "pedido"
          ? { order_id: entidadeId, numero }
          : { request_id: entidadeId, numero },
    });
  }

  return { enviado: true, sucesso: resultado.ok };
}

export async function executarCobrancaPrazos(admin: SupabaseClient): Promise<ResultadoCobranca> {
  const hojeISO = hojeSaoPaulo();

  const resultado: ResultadoCobranca = {
    pedidos_cobrados: 0,
    solicitacoes_cobradas: 0,
    mensagens_enviadas: 0,
    erros: 0,
  };

  const [{ data: pedidos }, { data: solicitacoes }] = await Promise.all([
    admin
      .from("pedidos_compra")
      .select("id, numero, criado_em, obra:obras(nome)")
      .eq("status", "AGUARDANDO_APROVACAO"),
    admin
      .from("solicitacoes_compra")
      .select("id, numero, criado_em, obra:obras(nome)")
      .eq("status", "AGUARDANDO_APROVACAO"),
  ]);

  for (const pedido of pedidos ?? []) {
    try {
      const destinatarios = await resolverDestinatariosPedido(admin, pedido.id);
      if (!destinatarios.length) continue;

      const dias = diasEmAberto(pedido.criado_em, hojeISO);
      const obraNome = (pedido.obra as any)?.nome ?? "Sem obra";
      const mensagem =
        `📦 Pedido #${pedido.numero} aguardando aprovação há ${dias} dia(s).\n` +
        `Obra: ${obraNome}\n` +
        `Acesse: ${APP_URL}/squadframe/compras/pedidos/${pedido.id}`;

      resultado.pedidos_cobrados++;
      for (const destinatario of destinatarios) {
        const r = await enviarParaDestinatario(admin, {
          entidade: "pedido",
          entidadeId: pedido.id,
          numero: pedido.numero,
          dataReferencia: hojeISO,
          destinatario,
          mensagem,
        });
        if (r.enviado) {
          resultado.mensagens_enviadas++;
          if (!r.sucesso) resultado.erros++;
        }
      }
    } catch {
      resultado.erros++;
    }
  }

  for (const solicitacao of solicitacoes ?? []) {
    try {
      const destinatarios = await resolverDestinatariosSolicitacao(admin, solicitacao.id);
      if (!destinatarios.length) continue;

      const dias = diasEmAberto(solicitacao.criado_em, hojeISO);
      const obraNome = (solicitacao.obra as any)?.nome ?? "Sem obra";
      const mensagem =
        `📋 Solicitação #${solicitacao.numero} aguardando aprovação há ${dias} dia(s).\n` +
        `Obra: ${obraNome}\n` +
        `Acesse: ${APP_URL}/squadframe/compras/solicitacoes`;

      resultado.solicitacoes_cobradas++;
      for (const destinatario of destinatarios) {
        const r = await enviarParaDestinatario(admin, {
          entidade: "solicitacao",
          entidadeId: solicitacao.id,
          numero: solicitacao.numero,
          dataReferencia: hojeISO,
          destinatario,
          mensagem,
        });
        if (r.enviado) {
          resultado.mensagens_enviadas++;
          if (!r.sucesso) resultado.erros++;
        }
      }
    } catch {
      resultado.erros++;
    }
  }

  return resultado;
}
