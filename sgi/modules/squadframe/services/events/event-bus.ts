import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { DomainEvent } from "./event-types";
import { CRITICAL_CONSUMERS, OBSERVER_CONSUMERS } from "./consumers";

export async function emitirEvento(
  tipo: string,
  payload: Record<string, unknown>,
  company_id: string = "default",
  idempotencyKey?: string,
): Promise<void> {
  const admin = createAdminClient();
  const event: DomainEvent = { tipo, payload, company_id };

  // Persiste o evento para observabilidade e replay futuro. Com
  // idempotencyKey explícita, republicar a mesma ocorrência (retry,
  // duplo clique) faz upsert (DO NOTHING no conflito) em vez de
  // criar uma segunda linha — sem chave, cai no default do trigger
  // (equivalente a "sempre única", igual ao comportamento de antes).
  const { data: registros } = await admin
    .from("eventos_dominio")
    .upsert(
      { tipo, payload, company_id, idempotency_key: idempotencyKey },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    )
    .select("id");

  if (idempotencyKey && !registros?.length) {
    // Conflito real: esta ocorrência já foi publicada antes. Não
    // reexecuta os consumers — é exatamente o que a idempotência
    // deveria evitar (efeito duplicado num retry/duplo clique).
    return;
  }

  const eventoId = registros?.[0]?.id as string | undefined;
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
