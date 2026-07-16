import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId, listarSetores } from "@/modules/wise/identity/service";
import { SetoresLista } from "@/modules/wise/identity/components/setores-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseSetoresPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const setores = await listarSetores(wiseUsuario.empresa_id);

  return <SetoresLista empresaId={wiseUsuario.empresa_id} setores={setores} />;
}
