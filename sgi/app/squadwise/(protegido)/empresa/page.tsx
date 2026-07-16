import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarEmpresa, listarUnidades } from "@/modules/wise/organizations/service";
import { EmpresaDetalhe } from "@/modules/wise/organizations/components/empresa-detalhe";

export const dynamic = "force-dynamic";

export default async function SquadWiseEmpresaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [empresa, unidades] = await Promise.all([
    buscarEmpresa(wiseUsuario.empresa_id),
    listarUnidades(wiseUsuario.empresa_id),
  ]);

  if (!empresa) redirect("/squadwise");

  return <EmpresaDetalhe empresa={empresa} unidades={unidades} />;
}
