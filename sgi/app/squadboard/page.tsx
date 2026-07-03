import { SquadBoardView } from "@/modules/squadboard/components/squad-board-view";
import { buscarPacotesBoard } from "@/modules/squadboard/actions/pacotes";

export const dynamic = "force-dynamic";

const PIPELINE_INICIAL = "engenharia" as const;

// Autenticação já é validada no layout.tsx do módulo.
//
// Dados reais dos Pacotes de Trabalho (lotes_obra), sem fallback para os
// mocks em produção — se a busca falhar, o erro sobe para o error boundary
// padrão do Next em vez de cair silenciosamente para dados fictícios.
//
// Fase 5: a home do board sempre abre no pipeline Engenharia; trocar de
// pipeline é uma ação client-side (ver SquadBoardView).
export default async function SquadBoardPage() {
  const pacotes = await buscarPacotesBoard(PIPELINE_INICIAL);
  return <SquadBoardView pipelineInicial={PIPELINE_INICIAL} pacotesIniciais={pacotes} />;
}
