import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId, listarUsuarios, listarSetores, listarCargos } from "@/modules/wise/identity/service";
import { listarPapeis } from "@/modules/wise/access/service";
import { listarAuditoria } from "@/modules/wise/audit/service";
import { VisaoGeral } from "@/modules/wise/components/dashboard/visao-geral";

export const dynamic = "force-dynamic";

export default async function SquadWiseVisaoGeralPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [usuarios, setores, cargos, papeis, auditoria] = await Promise.all([
    listarUsuarios(wiseUsuario.empresa_id),
    listarSetores(wiseUsuario.empresa_id),
    listarCargos(wiseUsuario.empresa_id),
    listarPapeis(wiseUsuario.empresa_id),
    listarAuditoria(wiseUsuario.empresa_id, 0),
  ]);

  return (
    <VisaoGeral
      totalUsuarios={usuarios.length}
      usuariosAtivos={usuarios.filter((u) => u.status === "ativo").length}
      convitesPendentes={usuarios.filter((u) => u.status === "convidado").length}
      usuariosBloqueados={usuarios.filter((u) => u.status === "bloqueado").length}
      totalSetores={setores.length}
      totalCargos={cargos.length}
      totalPapeis={papeis.length}
      eventosRecentes={auditoria.registros.slice(0, 8)}
    />
  );
}
