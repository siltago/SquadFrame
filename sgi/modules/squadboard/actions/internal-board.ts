"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { getProvider } from "../providers/registry";
import {
  getCachedColumns, setCachedColumns, invalidateCacheKey,
} from "./cache";
import { buildCacheKey } from "./cache-keys";
import { buscarBoardPorSetor } from "./workspace";
import type {
  InternalBoardColumn, InternalBoardCardDetail, InternalBoardMember,
  InternalCardMember, InternalCardLabel, InternalChecklist, InternalChecklistItem,
  InternalComment, InternalActivity, Setor,
} from "../types/internal-board";
import type { UpdateCardInput, CreateCardInput } from "../providers/index";
import type { CardEntityLink, EntityType } from "../types/entity-link";
import {
  notificarCardAtribuido,
  notificarCardMovido,
  notificarCardComentario,
  notificarChecklistMencao,
} from "./notifications";

// Contexto opcional para enriquecer notificações sem quebrar assinaturas existentes
type NotifCtx = {
  cardTitulo?: string;
  autorNome?: string;
  colunaAnterior?: string;
  colunaNova?: string;
  previewTexto?: string;
};

// ── Helpers internos ──────────────────────────────────────────────────

async function resolverBoard(setor: Setor) {
  const mapeamento = await buscarBoardPorSetor(setor);
  if (!mapeamento) return null;
  return mapeamento;
}

// Busca responsáveis SquadSystem para uma lista de card IDs (um query por board)
async function enriquecerResponsaveis(
  colunas: InternalBoardColumn[],
): Promise<InternalBoardColumn[]> {
  const cardIds = colunas.flatMap((c) => c.cards.map((card) => card.id));
  if (cardIds.length === 0) return colunas;

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_card_responsaveis")
    .select("card_id, usuarios(id, nome, email, foto_url)")
    .eq("provider", "trello")
    .in("card_id", cardIds);

  type Row = { card_id: string; usuarios: { id: string; nome: string; email: string; foto_url: string | null } | null };
  const map = new Map<string, InternalCardMember[]>();
  for (const row of (data as Row[] | null) ?? []) {
    if (!map.has(row.card_id)) map.set(row.card_id, []);
    if (row.usuarios) {
      map.get(row.card_id)!.push({
        id: row.usuarios.id,
        nome: row.usuarios.nome,
        email: row.usuarios.email,
        avatar: row.usuarios.foto_url ?? undefined,
      });
    }
  }

  return colunas.map((col) => ({
    ...col,
    cards: col.cards.map((card) => ({
      ...card,
      responsaveis: map.get(card.id) ?? [],
    })),
  }));
}

// ── Quadro (com cache) ────────────────────────────────────────────────

export async function buscarColunasPorSetor(
  setor: Setor,
): Promise<{ colunas: InternalBoardColumn[]; stale: boolean }> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) return { colunas: [], stale: false };

  const cacheKey = buildCacheKey("trello", mapeamento.boardId);
  const cached = await getCachedColumns(cacheKey);

  if (cached && !cached.stale) {
    const colunas = await enriquecerResponsaveis(cached.columns);
    return { colunas, stale: false };
  }

  if (cached && cached.stale) {
    const colunas = await enriquecerResponsaveis(cached.columns);
    return { colunas, stale: true };
  }

  const provider = getProvider("trello");
  const colunasRaw = await provider.getColumns(mapeamento.boardId, setor);
  await setCachedColumns(cacheKey, colunasRaw, "trello");
  const colunas = await enriquecerResponsaveis(colunasRaw);
  return { colunas, stale: false };
}

/** Chamado pelo cliente quando stale=true para atualizar cache em background */
export async function atualizarColunasEmBackground(setor: Setor): Promise<InternalBoardColumn[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) return [];

  const provider = getProvider("trello");
  const colunasRaw = await provider.getColumns(mapeamento.boardId, setor);
  const cacheKey = buildCacheKey("trello", mapeamento.boardId);
  await setCachedColumns(cacheKey, colunasRaw, "trello");
  return enriquecerResponsaveis(colunasRaw);
}

// ── Detalhe do card ───────────────────────────────────────────────────

export async function buscarCardInterno(
  cardId: string,
  setor: Setor,
): Promise<InternalBoardCardDetail> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const provider = getProvider("trello");
  const detalhe = await provider.getCard(cardId, setor);

  // Sobrescrever responsaveis com usuários SquadSystem (não Trello)
  const admin = createAdminClient();
  const { data: respData } = await admin
    .from("board_card_responsaveis")
    .select("usuarios(id, nome, email, foto_url)")
    .eq("provider", "trello")
    .eq("card_id", cardId);

  type RespRow = { usuarios: { id: string; nome: string; email: string; foto_url: string | null } | null };
  detalhe.responsaveis = ((respData as RespRow[] | null) ?? [])
    .filter((r) => r.usuarios !== null)
    .map((r) => ({
      id: r.usuarios!.id,
      nome: r.usuarios!.nome,
      email: r.usuarios!.email,
      avatar: r.usuarios!.foto_url ?? undefined,
    }));

  // Enriquecer com relacionamentos locais
  detalhe.relacionamentos = await buscarRelacionamentos(cardId, "trello");

  return detalhe;
}

// ── Movimentação ──────────────────────────────────────────────────────

export async function moverCardInterno(
  cardId: string,
  novaListaId: string,
  setor: Setor,
  ctx?: Pick<NotifCtx, "cardTitulo" | "colunaNova">,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const provider = getProvider("trello");
  await provider.moveCard(cardId, novaListaId, mapeamento.boardId);

  const cacheKey = buildCacheKey("trello", mapeamento.boardId);
  await invalidateCacheKey(cacheKey);

  if (ctx?.cardTitulo && ctx?.colunaNova) {
    try {
      await notificarCardMovido({
        cardId,
        setor,
        cardTitulo: ctx.cardTitulo,
        colunaNova: ctx.colunaNova,
        autorId: usuario.id,
      });
    } catch {}
  }
}

// ── Edição ────────────────────────────────────────────────────────────

export async function editarCardInterno(
  cardId: string,
  campos: UpdateCardInput,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const provider = getProvider("trello");
  await provider.updateCard(cardId, mapeamento.boardId, campos);
}

// ── Checklists ────────────────────────────────────────────────────────

export async function toggleCheckItemInterno(
  cardId: string,
  checkItemId: string,
  concluido: boolean,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const provider = getProvider("trello");
  await provider.toggleCheckItem(cardId, mapeamento.boardId, checkItemId, concluido);
}

// ── Criação ───────────────────────────────────────────────────────────

export async function criarCardInterno(
  setor: Setor,
  input: CreateCardInput,
): Promise<string> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const provider = getProvider("trello");
  const cardId = await provider.createCard(mapeamento.boardId, input);
  const cacheKey = buildCacheKey("trello", mapeamento.boardId);
  await invalidateCacheKey(cacheKey);
  return cardId;
}

// ── Responsáveis SquadSystem ──────────────────────────────────────────
// Responsáveis são usuários do SquadSystem, armazenados localmente no Supabase.
// Não há sincronização com membros do Trello.

export async function adicionarResponsavelCard(
  cardId: string,
  setor: Setor,
  usuarioId: string,
  ctx?: Pick<NotifCtx, "cardTitulo" | "autorNome">,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  const boardId = mapeamento?.boardId ?? setor;

  const admin = createAdminClient();
  await admin.from("board_card_responsaveis").upsert(
    { provider: "trello", card_id: cardId, board_id: boardId, usuario_id: usuarioId },
    { onConflict: "provider,card_id,usuario_id" },
  );

  // Notifica o usuário adicionado (apenas se for diferente de quem está adicionando)
  if (usuarioId !== usuario.id && ctx?.cardTitulo) {
    try {
      await notificarCardAtribuido({
        cardId,
        setor,
        cardTitulo: ctx.cardTitulo,
        usuarioId,
        autorNome: ctx.autorNome ?? usuario.email ?? "Alguém",
      });
    } catch {}
  }
}

export async function removerResponsavelCard(
  cardId: string,
  usuarioId: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin
    .from("board_card_responsaveis")
    .delete()
    .eq("provider", "trello")
    .eq("card_id", cardId)
    .eq("usuario_id", usuarioId);
}

// ── Labels ────────────────────────────────────────────────────────────

export async function buscarLabelsBoard(setor: Setor): Promise<InternalCardLabel[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) return [];

  return getProvider("trello").getBoardLabels(mapeamento.boardId);
}

export async function adicionarLabelCard(
  cardId: string,
  labelId: string,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  await getProvider("trello").addLabel(cardId, mapeamento.boardId, labelId);
}

export async function removerLabelCard(
  cardId: string,
  labelId: string,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  await getProvider("trello").removeLabel(cardId, mapeamento.boardId, labelId);
}

// ── Comentários ───────────────────────────────────────────────────────

export async function criarComentario(
  cardId: string,
  texto: string,
  setor: Setor,
  ctx?: Pick<NotifCtx, "cardTitulo" | "autorNome">,
): Promise<InternalComment> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  const comentario = await getProvider("trello").createComment(cardId, texto);

  if (ctx?.cardTitulo) {
    try {
      await notificarCardComentario({
        cardId,
        setor,
        cardTitulo: ctx.cardTitulo,
        autorId: usuario.id,
        autorNome: ctx.autorNome ?? usuario.email ?? "Alguém",
        previewTexto: texto,
      });
    } catch {}
  }

  return comentario;
}

// ── Checklists CRUD ───────────────────────────────────────────────────

export async function criarChecklist(
  cardId: string,
  nome: string,
  setor: Setor,
): Promise<InternalChecklist> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  return getProvider("trello").createChecklist(cardId, mapeamento.boardId, nome);
}

export async function renomearChecklist(
  checklistId: string,
  nome: string,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  await getProvider("trello").updateChecklist(checklistId, nome);
}

export async function excluirChecklist(
  checklistId: string,
  cardId: string,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  await getProvider("trello").deleteChecklist(checklistId, cardId, mapeamento.boardId);
}

export async function criarItemChecklist(
  checklistId: string,
  cardId: string,
  nome: string,
  setor: Setor,
  ctx?: Pick<NotifCtx, "cardTitulo" | "autorNome">,
): Promise<InternalChecklistItem> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const item = await getProvider("trello").createChecklistItem(checklistId, cardId, nome);

  if (ctx?.cardTitulo && /@\S+/.test(nome)) {
    try {
      await notificarChecklistMencao({
        cardId,
        setor,
        cardTitulo: ctx.cardTitulo,
        itemTexto: nome,
        autorId: usuario.id,
        autorNome: ctx.autorNome ?? usuario.email ?? "Alguém",
      });
    } catch {}
  }

  return item;
}

export async function atualizarItemChecklist(
  checklistId: string,
  itemId: string,
  cardId: string,
  nome: string,
  setor: Setor,
  ctx?: Pick<NotifCtx, "cardTitulo" | "autorNome">,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  await getProvider("trello").updateChecklistItem(checklistId, itemId, cardId, nome);

  if (ctx?.cardTitulo && /@\S+/.test(nome)) {
    try {
      await notificarChecklistMencao({
        cardId,
        setor,
        cardTitulo: ctx.cardTitulo,
        itemTexto: nome,
        autorId: usuario.id,
        autorNome: ctx.autorNome ?? usuario.email ?? "Alguém",
      });
    } catch {}
  }
}

export async function excluirItemChecklist(
  checklistId: string,
  itemId: string,
  cardId: string,
  setor: Setor,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) throw new Error("Setor não configurado.");

  await getProvider("trello").deleteChecklistItem(checklistId, itemId, cardId, mapeamento.boardId);
}

// ── Listas (para mover card) ──────────────────────────────────────────

export async function buscarListasDoBoard(setor: Setor) {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  if (!mapeamento) return [];

  return getProvider("trello").getAvailableColumns(mapeamento.boardId);
}

// ── Atividade ─────────────────────────────────────────────────────────

export async function buscarAtividades(
  cardId: string,
  setor: Setor,
): Promise<InternalActivity[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  return getProvider("trello").getActivities(cardId);
}

// ── Relacionamentos (Entity Links) ────────────────────────────────────

async function buscarRelacionamentos(
  cardId: string,
  provider: string,
): Promise<CardEntityLink[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_card_entities")
    .select("id, entity_type, entity_id, entity_label, created_at")
    .eq("provider", provider)
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    entityType: r.entity_type as EntityType,
    entityId: r.entity_id,
    entityLabel: r.entity_label ?? undefined,
    criadoEm: r.created_at,
  }));
}

export async function salvarRelacionamento(
  cardId: string,
  setor: Setor,
  entityType: EntityType,
  entityId: string,
  entityLabel?: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const mapeamento = await resolverBoard(setor);
  const boardId = mapeamento?.boardId ?? setor;

  const admin = createAdminClient();
  await admin.from("board_card_entities").upsert(
    {
      provider: "trello",
      card_id: cardId,
      board_id: boardId,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel ?? null,
    },
    { onConflict: "provider,card_id,entity_type,entity_id" },
  );
}

export async function removerRelacionamento(linkId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin.from("board_card_entities").delete().eq("id", linkId);
}
