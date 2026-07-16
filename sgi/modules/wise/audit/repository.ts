import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseAuditoria } from "./types";

export async function inserirAuditoria(dados: {
  empresa_id: string;
  usuario_id: string | null;
  entidade: string;
  entidade_id: string;
  acao: string;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  origem?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("wise_auditoria").insert(dados);
  if (error) throw new Error(error.message);
}

export async function listarAuditoria(
  empresaId: string,
  opts: { pagina: number; porPagina: number },
): Promise<{ registros: WiseAuditoria[]; total: number }> {
  const admin = createAdminClient();
  const de = opts.pagina * opts.porPagina;
  const ate = de + opts.porPagina - 1;

  const { data, count } = await admin
    .from("wise_auditoria")
    .select("*", { count: "exact" })
    .eq("empresa_id", empresaId)
    .order("criado_em", { ascending: false })
    .range(de, ate);

  return { registros: (data ?? []) as WiseAuditoria[], total: count ?? 0 };
}
