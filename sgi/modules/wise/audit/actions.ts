"use server";

import * as service from "./service";
import type { WiseAuditoria } from "./types";

export async function listarAuditoriaAction(
  empresaId: string,
  pagina: number,
): Promise<{ registros: WiseAuditoria[]; total: number; porPagina: number }> {
  return service.listarAuditoria(empresaId, pagina);
}
