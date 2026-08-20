"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioId } from "./helpers";
import { buscarGestoresDoUsuario, ehGestorDoUsuario } from "@/modules/squadframe/services/hierarquia/gestores";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";

export async function obterUrlUploadEvidencia(pedidoId: string, nomeArquivo: string) {
  await getUsuarioId(); // só exige estar autenticado — não é gestão de documentos
  const admin = createAdminClient();
  const safe = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `pedidos/${pedidoId}/prorrogacao-${Date.now()}-${safe}`;
  const { data, error } = await admin.storage.from("pedido-docs").createSignedUploadUrl(caminho);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, token: data.token, caminho };
}

export async function solicitarProrrogacaoOuExcecao(params: {
  pedidoId: string;
  tipoPendencia: string;
  motivoPadrao: string;
  motivoDetalhe?: string;
  novaDataCompromisso: string; // YYYY-MM-DD
  responsavelId: string;
  evidenciaUrl?: string;
}): Promise<{ id: string; viradaExcecao: boolean }> {
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  if (params.motivoPadrao === "OUTRO" && !params.motivoDetalhe?.trim()) {
    throw new Error("Descreva o motivo quando selecionar 'Outro'.");
  }
  const hojeIso = new Date().toISOString().slice(0, 10);
  if (params.novaDataCompromisso <= hojeIso) {
    throw new Error("A nova data de compromisso precisa ser no futuro.");
  }

  // Regra: 1ª prorrogação do pedido+tipo é auto-aprovada (origem COMPRADOR,
  // ATIVA na hora). A 2ª em diante vira pedido de exceção
  // (PENDENTE_APROVACAO) — contamos TODAS as linhas de origem=COMPRADOR já
  // usadas, vencidas ou não, o que já implementa "não pode adiar de novo
  // sozinho pelo mesmo usuário" sem precisar de coluna/estado extra.
  const { count } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", params.pedidoId)
    .eq("tipo_pendencia", params.tipoPendencia)
    .eq("origem", "COMPRADOR");

  const jaUsouAutoProrrogacao = (count ?? 0) > 0;

  const { data: inserida, error } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .insert({
      pedido_id: params.pedidoId,
      tipo_pendencia: params.tipoPendencia,
      solicitado_por: usuarioId,
      motivo_padrao: params.motivoPadrao,
      motivo_detalhe: params.motivoDetalhe ?? null,
      nova_data_compromisso: params.novaDataCompromisso,
      responsavel_id: params.responsavelId,
      evidencia_url: params.evidenciaUrl ?? null,
      origem: jaUsouAutoProrrogacao ? "GESTOR" : "COMPRADOR",
      status: jaUsouAutoProrrogacao ? "PENDENTE_APROVACAO" : "ATIVA",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (jaUsouAutoProrrogacao) {
    const gestores = await buscarGestoresDoUsuario(usuarioId);
    if (!gestores.length) {
      throw new Error("Nenhum gestor disponível para aprovar a exceção — contate o administrador.");
    }
    await emitirEvento(EVENTS.PURCHASE_PENDENCY_EXCEPTION_REQUESTED, {
      prorrogacao_id: inserida.id,
      pedido_id: params.pedidoId,
      tipo_pendencia: params.tipoPendencia,
      solicitado_por: usuarioId,
      gestores_ids: gestores,
    });
  }

  return { id: inserida.id, viradaExcecao: jaUsouAutoProrrogacao };
}

export async function decidirExcecaoPendencia(prorrogacaoId: string, aprovar: boolean, motivoDecisao?: string) {
  const admin = createAdminClient();
  const gestorId = await getUsuarioId();

  const { data: pr } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .select("id, pedido_id, tipo_pendencia, solicitado_por, status")
    .eq("id", prorrogacaoId)
    .single();
  if (!pr) throw new Error("Solicitação não encontrada.");
  if (pr.status !== "PENDENTE_APROVACAO") throw new Error("Esta solicitação já foi decidida.");

  const podeDecidir = await ehGestorDoUsuario(gestorId, pr.solicitado_por);
  if (!podeDecidir) throw new Error("Você não é gestor do solicitante — não pode decidir esta exceção.");

  const { error } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .update({
      status: aprovar ? "ATIVA" : "REVOGADA",
      aprovado_por: gestorId,
      decidido_em: new Date().toISOString(),
      motivo_decisao_gestor: motivoDecisao ?? null,
    })
    .eq("id", prorrogacaoId);
  if (error) throw new Error(error.message);

  await emitirEvento(EVENTS.PURCHASE_PENDENCY_EXCEPTION_DECIDED, {
    prorrogacao_id: prorrogacaoId,
    pedido_id: pr.pedido_id,
    aprovado: aprovar,
    gestor_id: gestorId,
    solicitante_id: pr.solicitado_por,
  });
}

export type ExcecaoPendente = {
  id: string;
  pedidoId: string;
  pedidoNumero: string;
  tipoPendencia: string;
  solicitadoPorNome: string;
  motivoPadrao: string;
  motivoDetalhe: string | null;
  novaDataCompromisso: string;
  criadoEm: string;
};

// Leitura auxiliar pra UI do gestor — dataset pequeno (só pendentes), filtra
// com ehGestorDoUsuario em memória em vez de uma query hierárquica reversa.
export async function listarExcecoesPendentesParaGestor(gestorId: string): Promise<ExcecaoPendente[]> {
  const admin = createAdminClient();

  const { data: pendentes } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .select("id, pedido_id, tipo_pendencia, solicitado_por, motivo_padrao, motivo_detalhe, nova_data_compromisso, criado_em, pedido:pedidos_compra(numero), solicitante:usuarios!solicitado_por(nome)")
    .eq("status", "PENDENTE_APROVACAO")
    .order("criado_em", { ascending: true });

  if (!pendentes?.length) return [];

  const resultado: ExcecaoPendente[] = [];
  for (const p of pendentes) {
    if (!(await ehGestorDoUsuario(gestorId, p.solicitado_por))) continue;
    const pedidoRel = Array.isArray(p.pedido) ? p.pedido[0] : p.pedido;
    const solicitanteRel = Array.isArray(p.solicitante) ? p.solicitante[0] : p.solicitante;
    resultado.push({
      id: p.id,
      pedidoId: p.pedido_id,
      pedidoNumero: (pedidoRel as { numero: string } | null)?.numero ?? "",
      tipoPendencia: p.tipo_pendencia,
      solicitadoPorNome: (solicitanteRel as { nome: string } | null)?.nome ?? "",
      motivoPadrao: p.motivo_padrao,
      motivoDetalhe: p.motivo_detalhe,
      novaDataCompromisso: p.nova_data_compromisso,
      criadoEm: p.criado_em,
    });
  }
  return resultado;
}
