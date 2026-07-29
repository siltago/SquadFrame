import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { DomainEvent, EVENTS } from "../event-types";
import { getUsuariosComPermissao } from "./permissoes";

export async function notificacoesConsumerHandler(event: DomainEvent): Promise<void> {
  const admin = createAdminClient();
  const p = event.payload;

  switch (event.tipo) {
    // Pedido aprovado → notifica comprador
    case EVENTS.PURCHASE_ORDER_APPROVED: {
      const { order_id, usuario_id } = p;
      if (!order_id) break;

      const { data: pedido } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero")
        .eq("id", order_id)
        .single();

      if (pedido?.comprador_id && pedido.comprador_id !== usuario_id) {
        await admin.from("notificacoes").insert({
          usuario_id: pedido.comprador_id,
          tipo: "pedido_aprovado",
          payload: { numero: pedido.numero, order_id, aprovado_por: usuario_id },
        });
      }
      break;
    }

    // Pedido aguardando aprovação → notifica aprovadores com permissão
    case EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL: {
      const { order_id } = p;
      if (!order_id) break;

      // O evento não traz numero (só order_id) — busca do banco, igual
      // push.consumer.ts já faz pro push nativo. tipo_linha/obra_nome/
      // criado_por_nome só existem pra montar o corpo detalhado da
      // notificação, não influenciam quem é notificado.
      const { data: pedDetalhe } = await admin
        .from("pedidos_compra")
        .select("numero, tipo_linha, obras(nome), comprador:usuarios(nome)")
        .eq("id", order_id)
        .single();
      const numero = pedDetalhe?.numero ?? null;
      const tipo_linha = pedDetalhe?.tipo_linha ?? null;
      const obra_nome = (pedDetalhe?.obras as any)?.nome ?? null;
      const criado_por_nome = (pedDetalhe?.comprador as any)?.nome ?? null;

      const usuarioIds = await getUsuariosComPermissao("compras.pedido.aprovar");
      if (!usuarioIds.length) break;

      await admin.from("notificacoes").insert(
        usuarioIds.map((id) => ({
          usuario_id: id,
          tipo: "pedido_aguardando_aprovacao",
          payload: { numero, order_id, tipo_linha, obra_nome, criado_por_nome },
        }))
      );
      break;
    }

    // Solicitação aprovada → notifica solicitante
    case EVENTS.PURCHASE_REQUEST_APPROVED: {
      const { request_id, usuario_id } = p;
      if (!request_id) break;

      const { data: sol } = await admin
        .from("solicitacoes_compra")
        .select("solicitante_id, numero")
        .eq("id", request_id)
        .single();

      if (sol?.solicitante_id && sol.solicitante_id !== usuario_id) {
        await admin.from("notificacoes").insert({
          usuario_id: sol.solicitante_id,
          tipo: "solicitacao_aprovada",
          payload: { numero: sol.numero, request_id },
        });
      }
      break;
    }

    // Solicitação rejeitada → notifica solicitante
    case EVENTS.PURCHASE_REQUEST_REJECTED: {
      const { request_id, usuario_id } = p;
      if (!request_id) break;

      const { data: sol } = await admin
        .from("solicitacoes_compra")
        .select("solicitante_id, numero")
        .eq("id", request_id)
        .single();

      if (sol?.solicitante_id && sol.solicitante_id !== usuario_id) {
        await admin.from("notificacoes").insert({
          usuario_id: sol.solicitante_id,
          tipo: "solicitacao_rejeitada",
          payload: { numero: sol.numero, request_id },
        });
      }
      break;
    }

    // Retorno de pedido solicitado → notifica aprovadores
    case EVENTS.PURCHASE_ORDER_RETURN_REQUESTED: {
      const { order_id, retorno_id } = p;
      if (!order_id) break;

      // O evento não traz numero — busca do banco, igual push.consumer.ts.
      const { data: pedDetalhe } = await admin
        .from("pedidos_compra")
        .select("numero, tipo_linha, obras(nome)")
        .eq("id", order_id)
        .single();
      const numero = pedDetalhe?.numero ?? null;
      const tipo_linha = pedDetalhe?.tipo_linha ?? null;
      const obra_nome = (pedDetalhe?.obras as any)?.nome ?? null;

      const usuarioIds = await getUsuariosComPermissao("compras.pedido.aprovar_retorno");
      if (!usuarioIds.length) break;

      await admin.from("notificacoes").insert(
        usuarioIds.map((id) => ({
          usuario_id: id,
          tipo: "retorno_pedido_solicitado",
          payload: { numero, order_id, retorno_id, tipo_linha, obra_nome },
        }))
      );
      break;
    }

    // Retorno aprovado → notifica comprador
    case EVENTS.PURCHASE_ORDER_RETURN_APPROVED: {
      const { order_id, numero } = p;
      if (!order_id) break;

      const { data: pedido } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero")
        .eq("id", order_id)
        .single();

      if (pedido?.comprador_id) {
        await admin.from("notificacoes").insert({
          usuario_id: pedido.comprador_id,
          tipo: "retorno_pedido_aprovado",
          payload: { numero: pedido.numero ?? numero, order_id },
        });
      }
      break;
    }

    // Retorno rejeitado → notifica comprador
    case EVENTS.PURCHASE_ORDER_RETURN_REJECTED: {
      const { order_id, numero } = p;
      if (!order_id) break;

      const { data: pedido } = await admin
        .from("pedidos_compra")
        .select("comprador_id, numero")
        .eq("id", order_id)
        .single();

      if (pedido?.comprador_id) {
        await admin.from("notificacoes").insert({
          usuario_id: pedido.comprador_id,
          tipo: "retorno_pedido_rejeitado",
          payload: { numero: pedido.numero ?? numero, order_id },
        });
      }
      break;
    }

    // Devolução criada → notifica aprovadores
    case EVENTS.PURCHASE_ORDER_DEVOLUTION_CREATED: {
      const { order_id, devolucao_id, numero_devolucao } = p;
      if (!order_id) break;

      const { data: pedDetalhe } = await admin
        .from("pedidos_compra")
        .select("numero, obras(nome)")
        .eq("id", order_id)
        .single();
      const numero_pedido = pedDetalhe?.numero ?? null;
      const obra_nome = (pedDetalhe?.obras as any)?.nome ?? null;

      const usuarioIds = await getUsuariosComPermissao("compras.pedido.aprovar_devolucao");
      if (!usuarioIds.length) break;

      await admin.from("notificacoes").insert(
        usuarioIds.map((id) => ({
          usuario_id: id,
          tipo: "devolucao_pedido_criada",
          payload: { numero_devolucao, order_id, devolucao_id, numero_pedido, obra_nome },
        }))
      );
      break;
    }

    // Devolução aprovada / rejeitada-cancelada / enviada ao fornecedor /
    // entregue → notifica quem registrou a devolução.
    case EVENTS.PURCHASE_ORDER_DEVOLUTION_APPROVED:
    case EVENTS.PURCHASE_ORDER_DEVOLUTION_REJECTED:
    case EVENTS.PURCHASE_ORDER_DEVOLUTION_SENT:
    case EVENTS.PURCHASE_ORDER_DEVOLUTION_DELIVERED: {
      const { order_id, devolucao_id } = p;
      if (!order_id || !devolucao_id) break;

      const { data: dev } = await admin
        .from("devolucoes_compra")
        .select("numero, criado_por")
        .eq("id", devolucao_id)
        .single();
      if (!dev?.criado_por) break;

      const TIPO_POR_EVENTO: Record<string, string> = {
        [EVENTS.PURCHASE_ORDER_DEVOLUTION_APPROVED]:  "devolucao_pedido_aprovada",
        [EVENTS.PURCHASE_ORDER_DEVOLUTION_REJECTED]:  "devolucao_pedido_rejeitada",
        [EVENTS.PURCHASE_ORDER_DEVOLUTION_SENT]:      "devolucao_pedido_enviada",
        [EVENTS.PURCHASE_ORDER_DEVOLUTION_DELIVERED]: "devolucao_pedido_entregue",
      };

      await admin.from("notificacoes").insert({
        usuario_id: dev.criado_por,
        tipo: TIPO_POR_EVENTO[event.tipo],
        payload: { numero_devolucao: dev.numero, order_id, devolucao_id },
      });
      break;
    }

    default:
      break;
  }
}
