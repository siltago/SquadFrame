import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { verificarPermissaoWise } from "@/modules/wise/access/service";
import { SquadWiseSidebar } from "@/modules/wise/components/shell/sidebar";
import { SquadWiseTopbar } from "@/modules/wise/components/shell/topbar";

// Shell do SquadWise — escopo de tema "squadwise" (violeta #60519B) +
// sidebar sempre escura fixa, mesmo padrão do SquadBoard. Só acessível
// a quem tem alguma permissão wise.* (papel is_admin passa direto, ver
// wise_fn_tem_permissao). Governança não é módulo de uso geral, então
// não tem card visível de "ativo" no hub ainda — acesso é só por quem
// já tem permissão.
export default async function SquadWiseLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const podeAcessar =
    (await verificarPermissaoWise(wiseUsuario.id, "wise.usuarios.visualizar")) ||
    (await verificarPermissaoWise(wiseUsuario.id, "wise.papeis.gerenciar"));
  if (!podeAcessar) redirect("/");

  return (
    <div className="squadwise flex h-screen bg-bg text-text">
      <SquadWiseSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SquadWiseTopbar usuario={usuario} />
        <main className="flex-1 overflow-y-auto py-6">{children}</main>
      </div>
    </div>
  );
}
