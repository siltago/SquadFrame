import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  getSetorComprasId,
  garantirColunasCompras,
  moverTarefaPedido,
} from "@/lib/kanban-compras";
import { criarTarefaAutomatica } from "@/lib/tarefas";
import { DomainEvent, EVENTS } from "../event-types";

// Cancela ou conclui a tarefa de uma solicitação de compra
async function resolverTarefaSolicitacao(
  requestId: string,
  usuarioId: string | null,
  resolucao: "CONCLUIDA" | "CANCELADA",
): Promise<void> {
  const admin = createAdminClient();
  const { data: tarefa } = await admin
    .from("tarefas")
    .select("id")
    .eq("entidade_ref", "solicitacao")
    .eq("entidade_ref_id", requestId)
    .is("deleted_at", null)
    .not("status", "in", '("CANCELADA","CONCLUIDA")')
    .maybeSingle();

  if (!tarefa) return;

  const setorId = await getSetorComprasId();
  let colunaConcluidaId: string | null = null;

  if (resolucao === "CONCLUIDA" && setorId) {
    const colunas = await garantirColunasCompras(setorId);
    colunaConcluidaId = colunas["Concluído"] ?? null;
  }

  await admin.from("tarefas").update({
    status: resolucao,
    concluida_em: new Date().toISOString(),
    ...(colunaConcluidaId ? { coluna_id: colunaConcluidaId } : {}),
  }).eq("id", tarefa.id);

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefa.id,
    usuario_id: usuarioId,
    acao: resolucao === "CONCLUIDA" ? "CONCLUIDA_AUTOMATICAMENTE" : "CANCELADA",
    dados: { origem: "compras" },
  });
}

export async function kanbanConsumerHandler(event: DomainEvent): Promise<void> {
  const p = event.payload;

  switch (event.tipo) {
    // ── Solicitações ──────────────────────────────────────────────────────────

    case EVENTS.PURCHASE_REQUEST_CREATED: {
      const setorId = await getSetorComprasId();
      // BUG 4 FIX: setor não encontrado → erro visível em eventos_dominio
      if (!setorId) throw new Error("Setor Compras não encontrado. Verifique se existe um setor com 'compra' no nome.");
      const colunas = await garantirColunasCompras(setorId);
      await criarTarefaAutomatica({
        titulo: `Solicitação ${p.numero} — aguardando pedido`,
        setor_id: setorId,
        origem: "COMPRA",
        entidade_ref: "solicitacao",
        entidade_ref_id: p.request_id as string,
        obra_id: (p.obra_id as string | null) ?? undefined,
        prioridade: p.prioridade === "URGENTE" ? "ALTA" : "MEDIA",
        criado_por: (p.solicitante_id as string) ?? undefined,
        coluna_id: colunas["Solicitações abertas"],
      });
      break;
    }

    // OPCIONAL Opção B — solicitação submetida para aprovação: move para "Solicitações em aprovação"
    case EVENTS.PURCHASE_REQUEST_SUBMITTED: {
      const admin = createAdminClient();
      const { data: tarefa } = await admin
        .from("tarefas")
        .select("id")
        .eq("entidade_ref", "solicitacao")
        .eq("entidade_ref_id", p.request_id as string)
        .is("deleted_at", null)
        .not("status", "in", '("CANCELADA","CONCLUIDA")')
        .maybeSingle();

      if (!tarefa) break;

      const setorId = await getSetorComprasId();
      if (!setorId) throw new Error("Setor Compras não encontrado.");
      const colunas = await garantirColunasCompras(setorId);
      const colunaId = colunas["Solicitações em aprovação"] ?? null;
      if (!colunaId) break;

      await admin.from("tarefas").update({ coluna_id: colunaId }).eq("id", tarefa.id);
      await admin.from("tarefa_historico").insert({
        tarefa_id: tarefa.id,
        usuario_id: (p.usuario_id as string | null) ?? null,
        acao: "MOVIDA_AUTOMATICAMENTE",
        dados: { status: "AGUARDANDO_APROVACAO" },
      });
      break;
    }

    case EVENTS.PURCHASE_REQUEST_APPROVED: {
      await resolverTarefaSolicitacao(
        p.request_id as string,
        (p.usuario_id as string | null) ?? null,
        "CONCLUIDA",
      );
      break;
    }

    case EVENTS.PURCHASE_REQUEST_REJECTED:
    case EVENTS.PURCHASE_REQUEST_CANCELLED: {
      await resolverTarefaSolicitacao(
        p.request_id as string,
        (p.usuario_id as string | null) ?? null,
        "CANCELADA",
      );
      break;
    }

    case EVENTS.PURCHASE_REQUEST_DELETED: {
      const admin = createAdminClient();
      const requestIds = p.request_ids as string[];

      const { data: tarefas } = await admin
        .from("tarefas")
        .select("id")
        .eq("entidade_ref", "solicitacao")
        .in("entidade_ref_id", requestIds)
        .is("deleted_at", null)
        .not("status", "in", '("CANCELADA","CONCLUIDA")');

      if (!tarefas?.length) break;

      const tarefaIds = tarefas.map((t) => t.id);
      const agora = new Date().toISOString();

      await admin.from("tarefas")
        .update({ status: "CANCELADA", concluida_em: agora })
        .in("id", tarefaIds);

      await admin.from("tarefa_historico").insert(
        tarefaIds.map((id) => ({
          tarefa_id: id,
          usuario_id: (p.deleted_by as string | null) ?? null,
          acao: "CANCELADA",
          dados: { motivo: "Solicitação excluída" },
        })),
      );
      break;
    }

    // ── Pedidos ───────────────────────────────────────────────────────────────

    case EVENTS.PURCHASE_ORDER_CREATED: {
      const setorId = await getSetorComprasId();
      // BUG 4 FIX: setor não encontrado → erro visível em eventos_dominio
      if (!setorId) throw new Error("Setor Compras não encontrado. Verifique se existe um setor com 'compra' no nome.");
      const colunas = await garantirColunasCompras(setorId);

      let tituloTarefa = `Pedido ${p.numero}`;
      if (p.obra_id) {
        const admin = createAdminClient();
        const { data: obra } = await admin
          .from("obras")
          .select("nome")
          .eq("id", p.obra_id as string)
          .maybeSingle();
        if (obra?.nome) tituloTarefa += ` — ${obra.nome}`;
      }

      await criarTarefaAutomatica({
        titulo: tituloTarefa,
        setor_id: setorId,
        origem: "COMPRA",
        entidade_ref: "pedido",
        entidade_ref_id: p.order_id as string,
        pedido_id: p.order_id as string,
        obra_id: (p.obra_id as string | null) ?? undefined,
        prioridade: "MEDIA",
        criado_por: (p.comprador_id as string) ?? undefined,
        coluna_id: colunas["Rascunho"],
      });
      break;
    }

    case EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL:
    case EVENTS.PURCHASE_ORDER_APPROVED:
    case EVENTS.PURCHASE_ORDER_EMITTED:
    case EVENTS.PURCHASE_ORDER_SENT:
    case EVENTS.PURCHASE_ORDER_CANCELLED:
    case EVENTS.PURCHASE_ORDER_RECEIVED_PARTIAL:
    case EVENTS.PURCHASE_ORDER_RECEIVED_FULL: {
      await moverTarefaPedido(
        p.order_id as string,
        p.status_novo as string,
        (p.usuario_id as string) ?? undefined,
      );
      break;
    }

    // BUG 2 FIX: move o card para "Concluído" antes de cancelar.
    // Antes: status="CANCELADA" mas coluna permanecia onde estava (Rascunho, Aprovados etc.)
    // Agora: status="CANCELADA" + coluna_id="Concluído" — consistente com pedido cancelado via status.
    case EVENTS.PURCHASE_ORDER_DELETED: {
      const admin = createAdminClient();
      const orderIds = p.order_ids as string[];

      const { data: tarefas } = await admin
        .from("tarefas")
        .select("id")
        .eq("entidade_ref", "pedido")
        .in("entidade_ref_id", orderIds)
        .is("deleted_at", null)
        .not("status", "in", '("CANCELADA","CONCLUIDA")');

      if (!tarefas?.length) break;

      const tarefaIds = tarefas.map((t) => t.id);
      const agora = new Date().toISOString();

      // Busca coluna "Concluído" para mover o card junto com o cancelamento
      const setorId = await getSetorComprasId();
      const colunaConcluidoId = setorId
        ? (await garantirColunasCompras(setorId))["Concluído"] ?? null
        : null;

      await admin.from("tarefas")
        .update({
          status: "CANCELADA",
          concluida_em: agora,
          ...(colunaConcluidoId ? { coluna_id: colunaConcluidoId } : {}),
        })
        .in("id", tarefaIds);

      await admin.from("tarefa_historico").insert(
        tarefaIds.map((id) => ({
          tarefa_id: id,
          usuario_id: (p.deleted_by as string | null) ?? null,
          acao: "CANCELADA",
          dados: { motivo: "Pedido excluído" },
        })),
      );
      break;
    }

    default:
      break;
  }
}
