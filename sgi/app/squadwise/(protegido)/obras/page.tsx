import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { listarObras } from "@/modules/wise/works/service";
import { ObrasLista } from "@/modules/wise/works/components/obras-lista";
import { Button } from "@/ui/components/Button";
import { StatCard } from "@/ui/components/Card";
import { BuildingIcon, CheckCircleIcon, MapPinIcon, UsersIcon } from "@/ui/icons";

export const dynamic = "force-dynamic";

export default async function SquadWiseObrasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obras = await listarObras();

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
        <StatCard label="Total" value={obras.length} icon={<BuildingIcon size={18} />} variant="accent" />
        <StatCard
          label="Ativas"
          value={obras.filter((o) => !(o.status as any)?.is_final).length}
          icon={<CheckCircleIcon size={18} />}
          tone="success"
        />
        <StatCard
          label="Cidades"
          value={new Set(obras.map((o) => o.cidade).filter(Boolean)).size}
          icon={<MapPinIcon size={18} />}
          tone="info"
        />
        <StatCard
          label="Clientes"
          value={new Set(obras.map((o) => o.cliente_id)).size}
          icon={<UsersIcon size={18} />}
          tone="warning"
        />
      </div>

      <ObrasLista obras={obras} />
    </div>
  );
}
