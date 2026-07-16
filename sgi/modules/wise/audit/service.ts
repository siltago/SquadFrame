import "server-only";

import * as repo from "./repository";
import type { WiseAuditoria } from "./types";

// Único lugar que grava auditoria — chamado pelos services de
// identity/access nas ações sensíveis. Nunca chamado direto da UI.
export async function registrarAuditoria(dados: {
  empresa_id: string;
  usuario_id: string | null;
  entidade: string;
  entidade_id: string;
  acao: string;
  dados_antes?: Record<string, unknown> | null;
  dados_depois?: Record<string, unknown> | null;
}): Promise<void> {
  await repo.inserirAuditoria({
    empresa_id: dados.empresa_id,
    usuario_id: dados.usuario_id,
    entidade: dados.entidade,
    entidade_id: dados.entidade_id,
    acao: dados.acao,
    dados_antes: dados.dados_antes ?? null,
    dados_depois: dados.dados_depois ?? null,
    origem: "ui",
  });
}

export async function listarAuditoria(
  empresaId: string,
  pagina: number,
): Promise<{ registros: WiseAuditoria[]; total: number; porPagina: number }> {
  const porPagina = 30;
  const { registros, total } = await repo.listarAuditoria(empresaId, { pagina, porPagina });
  return { registros, total, porPagina };
}
