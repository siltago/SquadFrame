import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { DomainEvent, EVENTS } from "../event-types";

export async function sideEffectsConsumerHandler(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const admin = createAdminClient();

  switch (event.tipo) {
    // Quando pedido é APROVADO → marca solicitações vinculadas como EM_PEDIDO
    case EVENTS.PURCHASE_ORDER_APPROVED: {
      // Uma única query com join duplo: pedido_itens → solicitacao_itens
      // Antes: 2 queries sequenciais
      const { data: solItens } = await admin
        .from("pedido_itens")
        .select("si:solicitacao_itens!solicitacao_item_id(solicitacao_id)")
        .eq("pedido_id", p.order_id as string)
        .not("solicitacao_item_id", "is", null);

      if (!solItens?.length) break;

      const solIds = Array.from(new Set(
        solItens
          .flatMap((pi) => {
            const si = pi.si as unknown;
            if (Array.isArray(si)) return (si as { solicitacao_id: string }[]).map((s) => s.solicitacao_id);
            return si ? [(si as { solicitacao_id: string }).solicitacao_id] : [];
          })
          .filter(Boolean),
      ));

      if (solIds.length > 0) {
        await admin.from("solicitacoes_compra").update({ status: "EM_PEDIDO" }).in("id", solIds);
      }
      break;
    }

    // Quando pedido é EXCLUÍDO → reverte solicitações + remove arquivos do Storage
    // Só reverte solicitações que não têm mais nenhum pedido ativo vinculado.
    case EVENTS.PURCHASE_ORDER_DELETED: {
      const solIds       = (p.sol_ids as string[] | null) ?? [];
      const storagePaths = (p.storage_paths as string[] | null) ?? [];
      const deletedIds   = (p.order_ids as string[]);

      if (solIds.length > 0) {
        // Uma única query com join: pedido_itens → pedidos_compra → solicitacao_itens
        // Antes: 2 queries + N+1 loop (1 query por item dentro do for)
        const { data: vinculosAtivos } = await admin
          .from("pedido_itens")
          .select(`
            si:solicitacao_itens!solicitacao_item_id(solicitacao_id),
            pedido:pedidos_compra!pedido_id(status)
          `)
          .not("pedido_id", "in", `(${deletedIds.map((id) => `"${id}"`).join(",")})`)
          .not("solicitacao_item_id", "is", null);

        const solIdsAindaVinculadas = new Set<string>();

        for (const pi of vinculosAtivos ?? []) {
          const pedidoRaw = pi.pedido as unknown;
          const statusPedido = Array.isArray(pedidoRaw)
            ? (pedidoRaw[0] as { status?: string } | undefined)?.status
            : (pedidoRaw as { status?: string } | null)?.status;

          if (!statusPedido || ["CANCELADO", "FINALIZADO"].includes(statusPedido)) continue;

          const siRaw = pi.si as unknown;
          const solicitacaoId = Array.isArray(siRaw)
            ? (siRaw[0] as { solicitacao_id?: string } | undefined)?.solicitacao_id
            : (siRaw as { solicitacao_id?: string } | null)?.solicitacao_id;

          if (solicitacaoId) solIdsAindaVinculadas.add(solicitacaoId);
        }

        const solIdsParaReverter = solIds.filter((id) => !solIdsAindaVinculadas.has(id));
        if (solIdsParaReverter.length > 0) {
          await admin
            .from("solicitacoes_compra")
            .update({ status: "APROVADA" })
            .in("id", solIdsParaReverter)
            .eq("status", "EM_PEDIDO");
        }
      }

      if (storagePaths.length > 0) {
        const { error: storageErr } = await admin.storage
          .from("pedido-docs")
          .remove(storagePaths);
        if (storageErr) {
          throw new Error(`Falha ao remover arquivos do Storage: ${storageErr.message}`);
        }
      }
      break;
    }

    default:
      break;
  }
}
