"use server";

import * as service from "./service";
import type { WiseAuditoria } from "./types";

export async function listarAuditoriaAction(
  pagina: number,
): Promise<{ registros: WiseAuditoria[]; total: number; porPagina: number }> {
  return service.listarAuditoria(pagina);
}
