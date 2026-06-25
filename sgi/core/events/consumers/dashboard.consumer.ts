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
      revalidatePath("/compras");
      revalidatePath("/compras/solicitacoes");
      if (p.request_id) revalidatePath(`/compras/solicitacoes/${p.request_id}`);
      revalidatePath("/");
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_REQUEST_DELETED:
      revalidatePath("/compras/solicitacoes");
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_ORDER_CREATED:
      revalidatePath("/compras");
      revalidatePath("/compras/pedidos");
      revalidatePath("/");
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_ORDER_APPROVED:
      revalidatePath("/compras");
      revalidatePath("/compras/pedidos");
      if (p.order_id) revalidatePath(`/compras/pedidos/${p.order_id}`);
      revalidatePath("/compras/solicitacoes");
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL:
    case EVENTS.PURCHASE_ORDER_SENT:
    case EVENTS.PURCHASE_ORDER_CANCELLED:
    case EVENTS.PURCHASE_ORDER_RECEIVED_PARTIAL:
    case EVENTS.PURCHASE_ORDER_RECEIVED_FULL:
      revalidatePath("/compras");
      revalidatePath("/compras/pedidos");
      if (p.order_id) revalidatePath(`/compras/pedidos/${p.order_id}`);
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_ORDER_EDITED:
      if (p.order_id) {
        revalidatePath(`/compras/pedidos/${p.order_id}`);
        revalidatePath(`/compras/pedidos/${p.order_id}/editar`);
      }
      break;

    case EVENTS.PURCHASE_ORDER_DELETED:
      revalidatePath("/compras/pedidos");
      revalidatePath("/tarefas");
      break;

    case EVENTS.PURCHASE_RECEIPT_REGISTERED:
      revalidatePath("/compras");
      revalidatePath("/compras/pedidos");
      if (p.order_id) revalidatePath(`/compras/pedidos/${p.order_id}`);
      break;

    case EVENTS.SUPPLIER_CREATED:
    case EVENTS.SUPPLIER_UPDATED:
    case EVENTS.SUPPLIER_DELETED:
      revalidatePath("/compras/fornecedores");
      break;

    default:
      break;
  }
}
