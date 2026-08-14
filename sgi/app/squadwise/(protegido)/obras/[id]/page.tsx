import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarObra, listarStatusObra, listarClientes } from "@/modules/wise/works/service";
import { listarUnidades } from "@/modules/wise/organizations/service";
import { ObraDetalhe } from "@/modules/wise/works/components/obra-detalhe";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function ObraPage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obra = await buscarObra(params.id);
  if (!obra) notFound();

  const [clientes, statusOptions, unidades] =
    await Promise.all([
      listarClientes(),
      listarStatusObra(),
      listarUnidades(),
    ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <BackButton href="/squadwise/obras" />
      <div className="mt-4">
        <ObraDetalhe
          obra={obra}
          clientes={clientes}
          statusOptions={statusOptions}
          unidades={unidades}
        />
      </div>
    </div>
  );
}
