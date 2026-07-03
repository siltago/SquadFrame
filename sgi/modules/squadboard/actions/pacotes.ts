"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { revalidatePath } from "next/cache";
import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";
import { mapLoteParaBoardCard, type LoteBoardRaw } from "@/modules/squadboard/utils/map-pacote-to-card";
import { colunaValida, colunaPadrao, PIPELINES, type PipelineId } from "@/modules/squadboard/types/pipeline";

// Busca os Pacotes de Trabalho (lotes_obra) reais para um Pipeline do
// SquadBoard. Cada Pacote aparece com sua posição (`coluna`) dentro DESSE
// pipeline especificamente — o mesmo Pacote pode estar em colunas
// diferentes em Engenharia, Compras e Produção simultaneamente.
//
// Ainda não existem chaves de permissão dedicadas ao SquadBoard em
// modules/squadframe/lib/permissions.ts — mantém a mesma regra já aplicada
// em app/squadboard/layout.tsx (usuário autenticado). Ver limitação no
// relatório da Fase 5.
export async function buscarPacotesBoard(pipeline: PipelineId): Promise<BoardWorkPackageCard[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("lotes_obra")
    .select(`
      id, nome, criado_em, prioridade, prazo, responsavel_id,
      obra:obras!inner(id, nome, deleted_at),
      responsavel:usuarios(nome),
      tipologias:tipologias_obra(status),
      solicitacoes:solicitacoes_compra(id),
      pedidos:pedidos_compra(id),
      pipeline_status:pacote_pipeline_status(coluna, ordem)
    `)
    // Filtra a linha embutida de pacote_pipeline_status para este pipeline
    // (não exclui o Pacote se ele ainda não tiver linha — LEFT JOIN
    // implícito do PostgREST; sem match, pipeline_status volta vazio e o
    // mapper assume a primeira coluna do pipeline).
    .eq("pipeline_status.pipeline", pipeline)
    .is("obra.deleted_at", null)
    .order("criado_em", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as LoteBoardRaw[]).map((lote) => mapLoteParaBoardCard(lote, pipeline));
}

// Move um Pacote para uma coluna dentro de UM pipeline específico. Não
// afeta a posição do mesmo Pacote em nenhum outro pipeline (chave única é
// lote_id+pipeline — upsert nunca toca outras linhas).
export async function moverPacotePipeline(
  loteId: string,
  pipeline: PipelineId,
  coluna: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  if (!colunaValida(pipeline, coluna)) {
    throw new Error(`Coluna "${coluna}" não existe no pipeline "${pipeline}".`);
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("pacote_pipeline_status")
    .upsert(
      { lote_id: loteId, pipeline, coluna, ordem: 0, atualizado_em: new Date().toISOString() },
      { onConflict: "lote_id,pipeline" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/squadboard");
}

// Retorna a coluna atual do pacote em CADA um dos 3 pipelines.
// Usado pelo modal de detalhe para mostrar o progresso multi-pipeline.
export async function buscarStatusPipelines(
  loteId: string,
): Promise<Record<PipelineId, string>> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pacote_pipeline_status")
    .select("pipeline, coluna")
    .eq("lote_id", loteId);

  if (error) throw new Error(error.message);

  const resultado = Object.fromEntries(
    PIPELINES.map((p) => [p.id, colunaPadrao(p.id)]),
  ) as Record<PipelineId, string>;

  for (const row of data ?? []) {
    resultado[row.pipeline as PipelineId] = row.coluna;
  }

  return resultado;
}

// Atualiza campos editáveis de um pacote (nome, prioridade, prazo).
// Prioridade é armazenada em UPPERCASE no banco ('BAIXA','MEDIA','ALTA','CRITICA').
export async function atualizarPacote(
  id: string,
  campos: { nome?: string; prioridade?: PrioridadePacote | null; prazo?: string | null },
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const payload: Record<string, unknown> = {};
  if (campos.nome !== undefined) payload.nome = campos.nome;
  if (campos.prazo !== undefined) payload.prazo = campos.prazo;
  if ("prioridade" in campos) {
    payload.prioridade = campos.prioridade ? campos.prioridade.toUpperCase() : null;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("lotes_obra").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/squadboard");
}
