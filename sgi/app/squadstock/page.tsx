import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { SquadStockHome } from "@/modules/squadstock/components/squad-stock-home";

export const dynamic = "force-dynamic";

export default async function SquadStockPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return <SquadStockHome />;
}
