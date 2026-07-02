import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { sendPushToSubscriptions, type PushPayload, type PushSubscription } from "@/shared/providers/push/web-push";
import { DomainEvent, EVENTS } from "../event-types";

async function getSubsForUsers(userIds: string[]): Promise<PushSubscription[]> {
  if (!userIds.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  return (data ?? []) as PushSubscription[];
}

async function getUsersWithPermission(chave: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: perm } = await admin
    .from("permissoes")
    .select("id")
    .eq("chave", chave)
    .maybeSingle();
  if (!perm?.id) return [];

  const { data: cargoPerms } = await admin
    .from("cargo_permissoes")
    .select("cargo_id")
    .eq("permissao_id", perm.id);
  if (!cargoPerms?.length) return [];

  const cargoIds = cargoPerms.map((cp) => cp.cargo_id);
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id")
    .in("cargo_id", cargoIds)
    .eq("ativo", true);

  return (usuarios ?? []).map((u) => u.id);
}

async function push(userIds: string[], payload: PushPayload) {
  const subs = await getSubsForUsers(userIds);
  await sendPushToSubscriptions(subs, payload);
}

export async function pushConsumerHandler(event: DomainEvent): Promise<void> {
  const p = event.payload;

  switch (event.tipo) {
    // ── Pedidos ──────────────────────────────────────────────────────────────

    case EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("numero, tipo_linha, obras(nome)")
        .eq("id", p.order_id)
        .single();

      const tipo = ped?.tipo_linha ?? "compras";
      const numero = ped?.numero ?? "";
      const obra = (ped?.obras as any)?.nome ?? "";
      const obraLabel = obra ? ` · ${obra}` : "";

      const userIds = await getUsersWithPermission("compras.pedido.aprovar");
      await push(userIds, {
        title: `Pedido de ${tipo} aguardando aprovação`,
        body: `Pedido ${numero}${obraLabel} está aguardando aprovação`,
        url: `/compras/pedidos/${p.order_id}`,
        tag: `pedido-aprovacao-${p.order_id}`,
        actions: [{ action: "open", title: "Ver pedido" }],
      });
      break;
    }

    case EVENTS.PURCHASE_ORDER_APPROVED: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero")
        .eq("id", p.order_id)
        .single();
      if (ped?.comprador_id) {
        await push([ped.comprador_id], {
          title: "Pedido aprovado — emita agora",
          body: `Pedido ${ped.numero} foi aprovado`,
          url: `/compras/pedidos/${p.order_id}`,
          tag: `pedido-aprovado-${p.order_id}`,
        });
      }
      break;
    }

    case EVENTS.PURCHASE_ORDER_REJECTED: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero, tipo_linha, obras(nome)")
        .eq("id", p.order_id)
        .single();
      if (ped?.comprador_id) {
        const tipo = (ped?.tipo_linha ?? "compras").toLowerCase();
        const numero = ped?.numero ?? "";
        const obra = (ped?.obras as any)?.nome ?? "";
        const obraLabel = obra ? ` - ${obra}` : "";
        await push([ped.comprador_id], {
          title: `Pedido de ${tipo}${obraLabel} rejeitado`,
          body: `Pedido ${numero} foi rejeitado — revise e reenvie ou cancele`,
          url: `/compras/pedidos/${p.order_id}`,
          tag: `pedido-rejeitado-${p.order_id}`,
        });
      }
      break;
    }

    case EVENTS.PURCHASE_ORDER_RETURNED_TO_DRAFT: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero, tipo_linha, obras(nome)")
        .eq("id", p.order_id)
        .single();
      if (ped?.comprador_id) {
        const tipo = (ped?.tipo_linha ?? "compras").toLowerCase();
        const numero = ped?.numero ?? "";
        const obra = (ped?.obras as any)?.nome ?? "";
        const obraLabel = obra ? ` - ${obra}` : "";
        await push([ped.comprador_id], {
          title: `Pedido de ${tipo}${obraLabel} devolvido para edição`,
          body: `Pedido ${numero} foi devolvido para edição — faça as correções e reenvie`,
          url: `/compras/pedidos/${p.order_id}`,
          tag: `pedido-rascunho-${p.order_id}`,
        });
      }
      break;
    }

    case EVENTS.PURCHASE_ORDER_CANCELLED: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero, tipo_linha, obras(nome)")
        .eq("id", p.order_id)
        .single();
      if (ped?.comprador_id) {
        const tipo = (ped?.tipo_linha ?? "compras").toLowerCase();
        const numero = ped?.numero ?? "";
        const obra = (ped?.obras as any)?.nome ?? "";
        const obraLabel = obra ? ` - ${obra}` : "";
        await push([ped.comprador_id], {
          title: `Pedido de ${tipo}${obraLabel} cancelado`,
          body: `Pedido ${numero} foi cancelado`,
          url: `/compras/pedidos/${p.order_id}`,
          tag: `pedido-cancelado-${p.order_id}`,
        });
      }
      break;
    }

    case EVENTS.PURCHASE_ORDER_RECEIVED_FULL: {
      const admin = createAdminClient();
      const { data: ped } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero")
        .eq("id", p.order_id)
        .single();
      if (ped?.comprador_id) {
        await push([ped.comprador_id], {
          title: "Pedido recebido",
          body: `Pedido ${ped.numero} foi recebido integralmente`,
          url: `/compras/pedidos/${p.order_id}`,
          tag: `pedido-recebido-${p.order_id}`,
        });
      }
      break;
    }

    // ── Solicitações ──────────────────────────────────────────────────────────

    case EVENTS.PURCHASE_REQUEST_APPROVED: {
      const admin = createAdminClient();
      const { data: sol } = await admin
        .from("solicitacoes_compra")
        .select("solicitante_id, numero")
        .eq("id", p.request_id)
        .single();
      if (sol?.solicitante_id) {
        await push([sol.solicitante_id], {
          title: "Solicitação aprovada",
          body: `Solicitação ${sol.numero} foi aprovada`,
          url: `/compras/solicitacoes/${p.request_id}`,
          tag: `sol-aprovada-${p.request_id}`,
        });
      }
      break;
    }

    case EVENTS.PURCHASE_REQUEST_REJECTED: {
      const admin = createAdminClient();
      const { data: sol } = await admin
        .from("solicitacoes_compra")
        .select("solicitante_id, numero")
        .eq("id", p.request_id)
        .single();
      if (sol?.solicitante_id) {
        await push([sol.solicitante_id], {
          title: "Solicitação rejeitada",
          body: `Solicitação ${sol.numero} foi rejeitada`,
          url: `/compras/solicitacoes/${p.request_id}`,
          tag: `sol-rejeitada-${p.request_id}`,
        });
      }
      break;
    }

    default:
      break;
  }
}
