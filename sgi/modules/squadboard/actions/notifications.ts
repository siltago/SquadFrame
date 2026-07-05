import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  sendPushToSubscriptions,
  type PushPayload,
  type PushSubscription,
} from "@/shared/providers/push/web-push";
import type { NotificacaoTipo } from "@/modules/squadframe/types/kanban";
import type { Setor } from "../types/internal-board";

// ── Labels de setor para exibi��ão ─────────────────────────────────────

const SETOR_LABEL: Record<Setor, string> = {
  engenharia: "Engenharia",
  compras: "Compras",
  producao: "Produção",
};

// ── Helpers internos ────────���───────────────���──────────────────────────

async function getSubsForUsers(userIds: string[]): Promise<PushSubscription[]> {
  if (!userIds.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  return (data ?? []) as PushSubscription[];
}

// ── API pública ───────────────���────────────────────────────────────────

export async function notificarBoard(
  userIds: string[],
  tipo: NotificacaoTipo,
  payload: Record<string, unknown>,
  push?: PushPayload,
): Promise<void> {
  if (!userIds.length) return;
  try {
    const admin = createAdminClient();
    await admin
      .from("notificacoes")
      .insert(userIds.map((uid) => ({ usuario_id: uid, tipo, payload })));

    if (push) {
      const subs = await getSubsForUsers(userIds);
      await sendPushToSubscriptions(subs, push).catch(() => {});
    }
  } catch {
    // notificações nunca bloqueiam a operação principal
  }
}

/** Notifica todos os responsáveis de um card, excluindo opcionalmente o ator */
export async function notificarResponsaveisCard(
  cardId: string,
  tipo: NotificacaoTipo,
  payload: Record<string, unknown>,
  push?: PushPayload,
  excluirUsuarioId?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_card_responsaveis")
    .select("usuario_id")
    .eq("provider", "trello")
    .eq("card_id", cardId);

  let userIds = (data ?? []).map((r) => r.usuario_id as string);
  if (excluirUsuarioId) userIds = userIds.filter((id) => id !== excluirUsuarioId);

  await notificarBoard(userIds, tipo, payload, push);
}

// ── Helpers por evento ─────────────────────────────────────────────────

export async function notificarCardAtribuido(opts: {
  cardId: string;
  setor: Setor;
  cardTitulo: string;
  usuarioId: string;   // quem recebe
  autorNome: string;   // quem atribuiu
}): Promise<void> {
  const setorLabel = SETOR_LABEL[opts.setor];
  const url = `/squadboard/interno?card=${opts.cardId}`;

  await notificarBoard(
    [opts.usuarioId],
    "board_card_atribuido",
    {
      card_id: opts.cardId,
      card_titulo: opts.cardTitulo,
      setor: opts.setor,
      autor_nome: opts.autorNome,
    },
    {
      title: `SquadBoard — ${setorLabel}`,
      body: `${opts.autorNome} te atribuiu ao card\n"${opts.cardTitulo}"`,
      url,
      tag: `board-atribuido-${opts.cardId}`,
      actions: [{ action: "open", title: "Abrir card" }],
    },
  );
}

export async function notificarCardMovido(opts: {
  cardId: string;
  setor: Setor;
  cardTitulo: string;
  colunaNova: string;
  autorId: string;   // excluir das notificações
}): Promise<void> {
  const setorLabel = SETOR_LABEL[opts.setor];
  const url = `/squadboard/interno?card=${opts.cardId}`;

  await notificarResponsaveisCard(
    opts.cardId,
    "board_card_movido",
    {
      card_id: opts.cardId,
      card_titulo: opts.cardTitulo,
      setor: opts.setor,
      coluna_nova: opts.colunaNova,
    },
    {
      title: `SquadBoard — ${setorLabel}`,
      body: `Card movido para "${opts.colunaNova}"\n"${opts.cardTitulo}"`,
      url,
      tag: `board-movido-${opts.cardId}`,
    },
    opts.autorId,
  );
}

export async function notificarCardComentario(opts: {
  cardId: string;
  setor: Setor;
  cardTitulo: string;
  autorId: string;
  autorNome: string;
  previewTexto: string;
}): Promise<void> {
  const setorLabel = SETOR_LABEL[opts.setor];
  const url = `/squadboard/interno?card=${opts.cardId}`;
  const preview = opts.previewTexto.slice(0, 60) + (opts.previewTexto.length > 60 ? "…" : "");

  await notificarResponsaveisCard(
    opts.cardId,
    "board_card_comentario",
    {
      card_id: opts.cardId,
      card_titulo: opts.cardTitulo,
      setor: opts.setor,
      autor_nome: opts.autorNome,
      preview: preview,
    },
    {
      title: `SquadBoard — ${setorLabel}`,
      body: `${opts.autorNome} comentou no card\n"${opts.cardTitulo}"\n"${preview}"`,
      url,
      tag: `board-comentario-${opts.cardId}-${Date.now()}`,
    },
    opts.autorId,
  );
}

export async function notificarChecklistMencao(opts: {
  cardId: string;
  setor: Setor;
  cardTitulo: string;
  itemTexto: string;
  autorId: string;
  autorNome: string;
}): Promise<void> {
  // Detecta @mention no texto do item
  const match = opts.itemTexto.match(/@(\S+)/);
  if (!match) return;

  const primeiroNome = match[1].toLowerCase();
  const admin = createAdminClient();

  // Busca usuário pelo primeiro nome ou qualquer parte do nome (case-insensitive)
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, nome")
    .ilike("nome", `%${primeiroNome}%`)
    .eq("ativo", true)
    .order("nome")
    .limit(1);

  const mencionado = usuarios?.[0];
  if (!mencionado || mencionado.id === opts.autorId) return;

  const setorLabel = SETOR_LABEL[opts.setor];
  const url = `/squadboard/interno?card=${opts.cardId}`;

  await notificarBoard(
    [mencionado.id],
    "board_checklist_mencionado",
    {
      card_id: opts.cardId,
      card_titulo: opts.cardTitulo,
      setor: opts.setor,
      item_texto: opts.itemTexto,
      autor_nome: opts.autorNome,
    },
    {
      title: `SquadBoard — ${setorLabel}`,
      body: `${opts.autorNome} te mencionou no checklist\n"${opts.itemTexto}"`,
      url,
      tag: `board-mencao-${opts.cardId}-${mencionado.id}`,
    },
  );
}
