import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId, listarUsuarios, listarSetores, listarCargos } from "@/modules/wise/identity/service";
import { listarPapeisDoUsuario } from "@/modules/wise/access/service";
import { UsuariosLista } from "@/modules/wise/identity/components/usuarios-lista";

export const dynamic = "force-dynamic";

export default async function SquadWiseUsuariosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [usuarios, setores, cargos] = await Promise.all([
    listarUsuarios(wiseUsuario.empresa_id),
    listarSetores(wiseUsuario.empresa_id),
    listarCargos(wiseUsuario.empresa_id),
  ]);

  const usuariosComPapeis = await Promise.all(
    usuarios.map(async (u) => ({
      ...u,
      setorNome: setores.find((s) => s.id === u.setor_id)?.nome ?? null,
      cargoNome: cargos.find((c) => c.id === u.cargo_id)?.nome ?? null,
      papeis: await listarPapeisDoUsuario(u.id),
    })),
  );

  return (
    <UsuariosLista
      usuarios={usuariosComPapeis}
      empresaId={wiseUsuario.empresa_id}
      setores={setores}
      cargos={cargos}
    />
  );
}
