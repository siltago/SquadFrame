import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { SquadSystemHome } from "@/modules/home/components/squad-system-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return <SquadSystemHome nomeUsuario={usuario.nome} />;
}
