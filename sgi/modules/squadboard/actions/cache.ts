"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { InternalBoardColumn } from "../types/internal-board";

const CACHE_TTL_SECONDS = 300; // 5 minutos

type CacheRow = {
  key: string;
  payload: InternalBoardColumn[];
  provider: string;
  updated_at: string;
  expires_at: string;
};

// ── Leitura ───────────────────────────────────────────────────────────

export async function getCachedColumns(
  key: string,
): Promise<{ columns: InternalBoardColumn[]; stale: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_cache")
    .select("payload, expires_at")
    .eq("key", key)
    .maybeSingle();

  if (!data) return null;

  const stale = new Date(data.expires_at) < new Date();
  return { columns: data.payload as InternalBoardColumn[], stale };
}

// ── Escrita ───────────────────────────────────────────────────────────

export async function setCachedColumns(
  key: string,
  columns: InternalBoardColumn[],
  provider: string,
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000);

  await admin.from("board_cache").upsert(
    {
      key,
      payload: columns as unknown as Record<string, unknown>[],
      provider,
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "key" },
  );
}

// ── Invalidação ───────────────────────────────────────────────────────

export async function invalidateCacheKey(key: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("board_cache").delete().eq("key", key);
}

export async function invalidateCacheByProvider(provider: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("board_cache").delete().eq("provider", provider);
}

export async function limparTodoCache(): Promise<void> {
  const admin = createAdminClient();
  await admin.from("board_cache").delete().neq("key", "");
}

// ── Status ────────────────────────────────────────────────────────────

export type CacheStatus = {
  key: string;
  provider: string;
  updatedAt: string;
  expiresAt: string;
  stale: boolean;
};

export async function buscarStatusCache(): Promise<CacheStatus[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_cache")
    .select("key, provider, updated_at, expires_at")
    .order("updated_at", { ascending: false });

  const now = new Date();
  return (data ?? []).map((r) => ({
    key: r.key,
    provider: r.provider,
    updatedAt: r.updated_at,
    expiresAt: r.expires_at,
    stale: new Date(r.expires_at) < now,
  }));
}

