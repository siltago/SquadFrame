import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarUnidades } from "@/modules/wise/organizations/service";
import { UnidadesLista } from "@/modules/wise/organizations/components/unidades-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseUnidadesPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const unidades = await listarUnidades();

  return <UnidadesLista unidades={unidades} />;
}
