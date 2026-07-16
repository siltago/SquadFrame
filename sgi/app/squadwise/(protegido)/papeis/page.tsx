import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarPapeis, listarPermissoes } from "@/modules/wise/access/service";
import { PapeisCrud } from "@/modules/wise/access/components/papeis-crud";

export const dynamic = "force-dynamic";

export default async function SquadWisePapeisPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [papeis, permissoes] = await Promise.all([
    listarPapeis(wiseUsuario.empresa_id),
    listarPermissoes(),
  ]);

  return <PapeisCrud empresaId={wiseUsuario.empresa_id} papeisIniciais={papeis} permissoes={permissoes} />;
}
