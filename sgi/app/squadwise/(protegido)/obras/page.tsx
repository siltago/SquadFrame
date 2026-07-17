import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarObras } from "@/modules/wise/works/service";
import { ObrasLista } from "@/modules/wise/works/components/obras-lista";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function SquadWiseObrasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obras = await listarObras(wiseUsuario.empresa_id);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-3">SquadWise</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Obras</h1>
        </div>
        <Button as="a" href="/squadwise/obras/nova" size="sm">
          Nova obra
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",   value: obras.length },
          { label: "Ativas",  value: obras.filter((o) => !(o.status as any)?.is_final).length },
          { label: "Cidades", value: new Set(obras.map((o) => o.cidade).filter(Boolean)).size },
          { label: "Clientes",value: new Set(obras.map((o) => o.cliente_id)).size },
        ].map(({ label, value }) => (
          <div key={label} className="card px-4 py-3">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-0.5 text-xs text-text-2">{label}</p>
          </div>
        ))}
      </div>

      <ObrasLista obras={obras} />
    </div>
  );
}
