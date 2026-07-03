import type { BoardWorkPackageCard } from "@/modules/squadboard/types/work-package";

export type FiltrosBoard = {
  obraId: string;
  responsavelId: string;
  prioridade: string;
  coluna: string;
  prazo: "todos" | "atrasados" | "sem_prazo";
  busca: string;
};

export const FILTROS_VAZIOS: FiltrosBoard = {
  obraId: "",
  responsavelId: "",
  prioridade: "",
  coluna: "",
  prazo: "todos",
  busca: "",
};

export function temFiltroAtivo(filtros: FiltrosBoard): boolean {
  return (
    !!filtros.obraId ||
    !!filtros.responsavelId ||
    !!filtros.prioridade ||
    !!filtros.coluna ||
    filtros.prazo !== "todos" ||
    !!filtros.busca.trim()
  );
}

export function filtrarPacotes(pacotes: BoardWorkPackageCard[], filtros: FiltrosBoard): BoardWorkPackageCard[] {
  const hoje = new Date();
  const busca = filtros.busca.trim().toLowerCase();

  return pacotes.filter((p) => {
    if (filtros.obraId && p.obraId !== filtros.obraId) return false;
    if (filtros.responsavelId && p.responsavelId !== filtros.responsavelId) return false;
    if (filtros.prioridade && p.prioridade !== filtros.prioridade) return false;
    if (filtros.coluna && p.coluna !== filtros.coluna) return false;
    if (filtros.prazo === "sem_prazo" && p.prazo) return false;
    if (filtros.prazo === "atrasados" && (!p.prazo || new Date(p.prazo) >= hoje)) return false;
    if (busca && !p.nome.toLowerCase().includes(busca)) return false;
    return true;
  });
}
