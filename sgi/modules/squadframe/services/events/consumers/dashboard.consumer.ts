import "server-only";
import { revalidatePath } from "next/cache";
import { DomainEvent, EVENTS } from "../event-types";

export async function dashboardConsumerHandler(event: DomainEvent): Promise<void> {
  const p = event.payload;

  switch (event.tipo) {
    case EVENTS.PURCHASE_REQUEST_CREATED:
    case EVENTS.PURCHASE_REQUEST_SUBMITTED:
    case EVENTS.PURCHASE_REQUEST_APPROVED:
    case EVENTS.PURCHASE_REQUEST_REJECTED:
    case EVENTS.PURCHASE_REQUEST_CANCELLED:
      revalidatePath("/squadframe/compras");
      revalidatePath("/squadframe/compras/solicitacoes");
      if (p.request_id) revalidatePath(`/squadframe/compras/solicitacoes/${p.request_id}`);
      revalidatePath("/");
      revalidatePath("/squadframe/tarefas");
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.PURCHASE_REQUEST_DELETED:
      revalidatePath("/squadframe/compras/solicitacoes");
      revalidatePath("/squadframe/tarefas");
      break;

    case EVENTS.PURCHASE_ORDER_CREATED:
      revalidatePath("/squadframe/compras");
      revalidatePath("/squadframe/compras/pedidos");
      revalidatePath("/");
      revalidatePath("/squadframe/tarefas");
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.PURCHASE_ORDER_APPROVED:
      revalidatePath("/squadframe/compras");
      revalidatePath("/squadframe/compras/pedidos");
      if (p.order_id) revalidatePath(`/squadframe/compras/pedidos/${p.order_id}`);
      revalidatePath("/squadframe/compras/solicitacoes");
      revalidatePath("/squadframe/tarefas");
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL:
    case EVENTS.PURCHASE_ORDER_SENT:
    case EVENTS.PURCHASE_ORDER_CANCELLED:
    case EVENTS.PURCHASE_ORDER_RECEIVED_PARTIAL:
    case EVENTS.PURCHASE_ORDER_RECEIVED_FULL:
      revalidatePath("/squadframe/compras");
      revalidatePath("/squadframe/compras/pedidos");
      if (p.order_id) revalidatePath(`/squadframe/compras/pedidos/${p.order_id}`);
      revalidatePath("/squadframe/tarefas");
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.PURCHASE_ORDER_EDITED:
      if (p.order_id) {
        revalidatePath(`/squadframe/compras/pedidos/${p.order_id}`);
        revalidatePath(`/squadframe/compras/pedidos/${p.order_id}/editar`);
      }
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.PURCHASE_ORDER_DELETED:
      revalidatePath("/squadframe/compras/pedidos");
      revalidatePath("/squadframe/tarefas");
      break;

    case EVENTS.PURCHASE_RECEIPT_REGISTERED:
      revalidatePath("/squadframe/compras");
      revalidatePath("/squadframe/compras/pedidos");
      if (p.order_id) revalidatePath(`/squadframe/compras/pedidos/${p.order_id}`);
      if (p.obra_id) revalidatePath(`/squadframe/obras/${p.obra_id}`);
      break;

    case EVENTS.SUPPLIER_CREATED:
    case EVENTS.SUPPLIER_UPDATED:
    case EVENTS.SUPPLIER_DELETED:
      revalidatePath("/squadframe/compras/fornecedores");
      break;

    default:
      break;
  }
}
