import { buscarColunasPorSetor } from "@/modules/squadboard/actions/internal-board";
import { InternalBoardView } from "@/modules/squadboard/components/internal/internal-board-view";
import type { InternalBoardColumn } from "@/modules/squadboard/types/internal-board";

export const dynamic = "force-dynamic";

const SETOR_INICIAL = "engenharia" as const;

export default async function SquadBoardInternoPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const { card: initialCardId } = await searchParams;

  let colunasIniciais: InternalBoardColumn[] = [];
  let staleInicial = false;
  let configurado = true;

  try {
    const result = await buscarColunasPorSetor(SETOR_INICIAL);
    colunasIniciais = result.colunas;
    staleInicial = result.stale;
    configurado = result.colunas.length > 0;
  } catch {
    configurado = false;
  }

  return (
    <InternalBoardView
      setorInicial={SETOR_INICIAL}
      colunasIniciais={colunasIniciais}
      staleInicial={staleInicial}
      configurado={configurado}
      initialCardId={initialCardId}
    />
  );
}
