import { SquadBoardView } from "@/modules/squadboard/components/squad-board-view";
import { BOARD, CARDS } from "@/modules/squadboard/data/mock";

export const dynamic = "force-dynamic";

// Autenticação já é validada no layout.tsx do módulo.
export default function SquadBoardPage() {
  return <SquadBoardView board={BOARD} cardsIniciais={CARDS} />;
}
