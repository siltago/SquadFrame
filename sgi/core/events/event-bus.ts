import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { DomainEvent } from "./event-types";
import { CRITICAL_CONSUMERS, OBSERVER_CONSUMERS } from "./consumers";

export async function emitirEvento(
  tipo: string,
  payload: Record<string, unknown>,
  company_id: string = "default",
): Promise<void> {
  const admin = createAdminClient();
  const event: DomainEvent = { tipo, payload, company_id };

  // Persiste o evento para observabilidade e replay futuro
  const { data: registro } = await admin
    .from("eventos_dominio")
    .insert({ tipo, payload, company_id })
    .select("id")
    .single();

  const eventoId = registro?.id as string | undefined;
  if (eventoId) event.id = eventoId;

  // ── Consumers CRÍTICOS ──────────────────────────────────────
  // Falha aqui significa que o estado do DB pode estar inconsistente.
  // Re-throw correto: a operação inteira falhou.
  try {
    for (const consumer of CRITICAL_CONSUMERS) {
      await consumer(event);
    }
  } catch (err) {
    if (eventoId) {
      await admin
        .from("eventos_dominio")
        .update({ erro: `CRITICAL: ${String(err)}` })
        .eq("id", eventoId);
    }
    throw err;
  }

  // ── Consumers OBSERVERS ─────────────────────────────────────
  // Executam em paralelo. Falhas são registradas mas NÃO interrompem
  // a operação: o dado principal já foi salvo com sucesso.
  const resultados = await Promise.allSettled(
    OBSERVER_CONSUMERS.map((consumer) => consumer(event)),
  );

  const erros = resultados
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  if (erros.length > 0) {
    const erroMsg = erros.join(" | ");
    if (eventoId) {
      await admin
        .from("eventos_dominio")
        .update({ erro: erroMsg })
        .eq("id", eventoId);
    }
    // Não re-throw: operação principal bem-sucedida
    // TODO: emitir alerta de monitoramento quando retry for implementado
  } else {
    if (eventoId) {
      await admin
        .from("eventos_dominio")
        .update({ processado: true })
        .eq("id", eventoId);
    }
  }
}
