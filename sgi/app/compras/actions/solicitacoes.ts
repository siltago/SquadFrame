"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/core/permissions/permissions";
import { verificarPermissao } from "@/core/permissions/check-permission";
import { emitirEvento } from "@/core/events/event-bus";
import { EVENTS } from "@/core/events/event-types";
import { validarTransicaoSolicitacao } from "@/core/state-machines/compras";
import { getUsuario, getUsuarioId } from "./helpers";

export async function criarSolicitacao(formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_SOLICITACAO_CRIAR);

  const admin = createAdminClient();
  const usuario = await getUsuario();

  const obra_id       = (formData.get("obra_id") as string | null) || null;
  const origem        = formData.get("origem") as string;
  const prioridade    = formData.get("prioridade") as string;
  const justificativa = (formData.get("justificativa") as string | null) || null;
  const observacoes   = (formData.get("observacoes") as string | null) || null;
  const itensJson     = formData.get("itens") as string;

  if (!itensJson) throw new Error("Adicione ao menos um item.");
  const itens: {
    produto_id?: string | null;
    descricao_manual?: string;
    quantidade: number;
    unidade: string;
    observacoes?: string;
    cor_id?: string | null;
  }[] = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Adicione ao menos um item.");

  const produtoIds = itens.map((i) => i.produto_id).filter(Boolean) as string[];
  if (produtoIds.length > 0) {
    const { data: inativos } = await admin
      .from("produtos")
      .select("codigo_mestre, nome")
      .in("id", produtoIds)
      .eq("status", false);
    if (inativos && inativos.length > 0) {
      const nomes = inativos.map((p) => `${p.codigo_mestre} — ${p.nome}`).join(", ");
      throw new Error(`Produto(s) inativo(s) não podem ser solicitados: ${nomes}`);
    }
  }

  // RPC atômica: solicitacoes_compra + solicitacao_itens em uma única transação
  const { data: result, error } = await admin.rpc("criar_solicitacao", {
    p_obra_id:        obra_id,
    p_origem:         origem,
    p_prioridade:     prioridade,
    p_justificativa:  justificativa,
    p_observacoes:    observacoes,
    p_solicitante_id: usuario.id,
    p_itens:          JSON.stringify(itens),
  });
  if (error) throw new Error(error.message);

  const { id: solId, numero } = result as { id: string; numero: number };

  await emitirEvento(EVENTS.PURCHASE_REQUEST_CREATED, {
    request_id:     solId,
    numero,
    obra_id:        obra_id || null,
    solicitante_id: usuario.id,
    origem,
    prioridade,
    itens_count:    itens.length,
  });

  redirect(`/compras/solicitacoes/${solId}`);
}

export async function alterarStatusSolicitacao(
  id: string,
  status: string,
  observacoes?: string,
) {
  const permissaoNecessaria =
    status === "APROVADA"  ? PERMISSIONS.COMPRAS_SOLICITACAO_APROVAR  :
    status === "REJEITADA" ? PERMISSIONS.COMPRAS_SOLICITACAO_REJEITAR :
    PERMISSIONS.COMPRAS_SOLICITACAO_CRIAR;
  await verificarPermissao(permissaoNecessaria);

  if (status === "EM_PEDIDO") {
    throw new Error("O status EM_PEDIDO é gerenciado automaticamente pelo sistema.");
  }

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: sol } = await admin
    .from("solicitacoes_compra")
    .select("status")
    .eq("id", id)
    .single();
  if (!sol) throw new Error("Solicitação não encontrada.");

  validarTransicaoSolicitacao(sol.status, status);

  const { error } = await admin.from("solicitacoes_compra").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  const tipoEvento =
    status === "AGUARDANDO_APROVACAO" ? EVENTS.PURCHASE_REQUEST_SUBMITTED  :
    status === "APROVADA"             ? EVENTS.PURCHASE_REQUEST_APPROVED   :
    status === "REJEITADA"            ? EVENTS.PURCHASE_REQUEST_REJECTED   :
    EVENTS.PURCHASE_REQUEST_CANCELLED;

  await emitirEvento(tipoEvento, {
    request_id:  id,
    usuario_id,
    status_novo: status,
    dados:       { observacoes },
  });
}

export async function excluirSolicitacoes(ids: string[]) {
  if (!ids.length) return;
  await verificarPermissao(PERMISSIONS.COMPRAS_SOLICITACAO_CRIAR);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  // Verificação de bloqueio no TypeScript (mensagem amigável com números)
  const { data: bloqueadas } = await admin
    .from("solicitacoes_compra")
    .select("id, numero, status")
    .in("id", ids)
    .in("status", ["EM_PEDIDO"]);

  if (bloqueadas && bloqueadas.length > 0) {
    const numeros = bloqueadas.map((s) => s.numero ?? s.id).join(", ");
    throw new Error(
      `Não é possível excluir: as seguintes solicitações estão vinculadas a pedidos ativos: ${numeros}. ` +
      `Exclua os pedidos vinculados primeiro.`,
    );
  }

  // RPC atômica: delete itens + delete solicitações em uma única transação
  const { error } = await admin.rpc("excluir_solicitacoes_cascade", {
    p_sol_ids: ids,
  });
  if (error) throw new Error(error.message);

  await emitirEvento(EVENTS.PURCHASE_REQUEST_DELETED, {
    request_ids: ids,
    deleted_by:  usuario_id,
  });
}
