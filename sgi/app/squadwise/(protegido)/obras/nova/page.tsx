import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarStatusObra, listarClientes } from "@/modules/wise/works/service";
import { listarUnidades } from "@/modules/wise/organizations/service";
import { ObraForm } from "@/modules/wise/works/components/obra-form";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovaObraPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [clientes, statusOptions, unidades] = await Promise.all([
    listarClientes(),
    listarStatusObra(),
    listarUnidades(wiseUsuario.empresa_id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl">
      <BackButton href="/squadwise/obras" />
      <div className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-text-3">SquadWise · Obras</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nova obra</h1>
      </div>
      <ObraForm
        clientes={clientes}
        statusOptions={statusOptions}
        unidades={unidades}
      />
    </div>
  );
}
