import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarModulos, listarModulosHabilitados } from "@/modules/wise/organizations/service";
import { ModulosLista } from "@/modules/wise/organizations/components/modulos-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseModulosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [modulos, habilitados] = await Promise.all([
    listarModulos(),
    listarModulosHabilitados(wiseUsuario.empresa_id),
  ]);

  return (
    <ModulosLista
      empresaId={wiseUsuario.empresa_id}
      modulos={modulos}
      habilitadosIds={habilitados.map((m) => m.id)}
    />
  );
}
