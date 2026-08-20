import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { calcularBloqueio } from "./verificar-bloqueio";
import { buscarGestoresDoUsuario } from "@/modules/squadframe/services/hierarquia/gestores";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";
import { hojeSaoPaulo } from "@/modules/squadframe/services/cobranca/executar-cobranca";

export type ResultadoEscalonamento = {
  escalados: number;
  jaEscaladosHoje: number;
};

// Roda diariamente via /api/cron/escalonar-pendencias — varre compradores
// com pendência bruta em nível BLOQUEIO_EMISSAO (>5 dias) e escala pros
// gestores, uma vez por dia por pedido+tipo (dedup via UNIQUE em
// pendencia_escalonamento_log, mesmo truque "reserva antes de enviar" já
// usado em cobranca_log).
export async function escalonarPendenciasCriticas(admin: ReturnType<typeof createAdminClient>): Promise<ResultadoEscalonamento> {
  const hojeIso = hojeSaoPaulo();
  const resultado: ResultadoEscalonamento = { escalados: 0, jaEscaladosHoje: 0 };

  const { data: compradoresRaw } = await admin
    .from("pedidos_compra")
    .select("comprador_id")
    .in("status", ["RASCUNHO", "APROVADO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO"])
    .not("comprador_id", "is", null);

  const compradorIds = [...new Set((compradoresRaw ?? []).map((p) => p.comprador_id as string))];

  for (const compradorId of compradorIds) {
    const bloqueio = await calcularBloqueio(compradorId);
    if (bloqueio.nivel !== "BLOQUEIO_EMISSAO") continue;

    const gestores = await buscarGestoresDoUsuario(compradorId);
    if (!gestores.length) continue;

    for (const causa of bloqueio.pendenciasCausadoras) {
      const { error } = await admin
        .from("pendencia_escalonamento_log")
        .insert({ pedido_id: causa.pedidoId, tipo_pendencia: causa.tipo, data_referencia: hojeIso });

      if (error) {
        // Conflito de UNIQUE = já escalado hoje pra esse pedido+tipo — pula.
        resultado.jaEscaladosHoje += 1;
        continue;
      }

      await emitirEvento(EVENTS.PURCHASE_PENDENCY_ESCALATED, {
        pedido_id: causa.pedidoId,
        tipo_pendencia: causa.tipo,
        comprador_id: compradorId,
        dias_em_aberto: causa.diasEmAberto,
        gestores_ids: gestores,
      });
      resultado.escalados += 1;
    }
  }

  return resultado;
}
