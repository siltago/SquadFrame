import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { SquadFlowHome } from "@/modules/squadflow/components/squad-flow-home";

export const dynamic = "force-dynamic";

export default async function SquadFlowPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return <SquadFlowHome />;
}
