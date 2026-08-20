"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AcaoCompras, NivelSeveridade } from "@/modules/squadframe/services/pendencias/constantes";
import { NIVEL_MINIMO_PARA_BLOQUEAR_ACAO } from "@/modules/squadframe/services/pendencias/constantes";

export type ResultadoBloqueioClient = {
  bloqueado: boolean;
  nivel: NivelSeveridade;
  pendenciasCausadoras: { pedidoId: string; numero: string; tipo: string; diasEmAberto: number }[];
};

const BloqueioComprasContext = createContext<ResultadoBloqueioClient>({
  bloqueado: false,
  nivel: "NORMAL",
  pendenciasCausadoras: [],
});

export function BloqueioComprasProvider({ bloqueio, children }: { bloqueio: ResultadoBloqueioClient; children: ReactNode }) {
  return <BloqueioComprasContext.Provider value={bloqueio}>{children}</BloqueioComprasContext.Provider>;
}

// Botões de criar/enviar/emitir consomem isso pra desabilitar antecipadamente
// com uma mensagem explicativa, em vez de só descobrir no catch da action —
// o try/catch continua existindo nas actions como defesa em profundidade
// (ex: pendência surgiu entre o load da página e o clique).
export function useAcaoBloqueada(acao: AcaoCompras): { bloqueada: boolean; motivo: string | null } {
  const bloqueio = useContext(BloqueioComprasContext);
  const niveisQueBloqueiam = NIVEL_MINIMO_PARA_BLOQUEAR_ACAO[acao];
  const bloqueada = niveisQueBloqueiam.includes(bloqueio.nivel);
  if (!bloqueada) return { bloqueada: false, motivo: null };

  const lista = bloqueio.pendenciasCausadoras.map((p) => `${p.numero} (${p.diasEmAberto}d)`).join(", ");
  return {
    bloqueada: true,
    motivo: `Bloqueado por pendência crítica em aberto: ${lista}. Resolva ou solicite prorrogação/exceção nas Pendências de Compras.`,
  };
}
