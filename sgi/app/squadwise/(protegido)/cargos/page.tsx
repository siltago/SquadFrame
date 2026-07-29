import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId, listarCargos, listarSetores } from "@/modules/wise/identity/service";
import { CargosLista } from "@/modules/wise/identity/components/cargos-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseCargosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [cargos, setores] = await Promise.all([
    listarCargos(),
    listarSetores(),
  ]);

  return <CargosLista cargos={cargos} setores={setores} />;
}
