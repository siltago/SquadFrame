import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { verificarPermissaoWise } from "@/modules/wise/access/service";
import { listarAuditoria } from "@/modules/wise/audit/service";
import { AuditoriaLista } from "@/modules/wise/audit/components/auditoria-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseAuditoriaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const podeVer = await verificarPermissaoWise(wiseUsuario.id, "wise.auditoria.visualizar");
  if (!podeVer) redirect("/squadwise/usuarios");

  const { registros, total, porPagina } = await listarAuditoria(wiseUsuario.empresa_id, 0);

  return (
    <AuditoriaLista
      empresaId={wiseUsuario.empresa_id}
      registrosIniciais={registros}
      total={total}
      porPagina={porPagina}
    />
  );
}
