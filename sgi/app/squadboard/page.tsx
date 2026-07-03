import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { SquadBoardHome } from "@/modules/squadboard/components/squad-board-home";

export const dynamic = "force-dynamic";

export default async function SquadBoardPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return <SquadBoardHome />;
}
