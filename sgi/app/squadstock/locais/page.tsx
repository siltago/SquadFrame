import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { WarehouseIcon } from "@/ui/icons";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { LocaisCliente } from "@/modules/squadstock/components/locais-cliente";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.LOCAL_GERENCIAR);

  const admin = createAdminClient();
  const { data: locais } = await admin.from("stock_locais").select("id, nome, tipo, ativo").order("nome");

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
          <WarehouseIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locais de estoque</h1>
          <p className="text-sm text-text-3">Galpões, filiais e outros pontos físicos onde o material fica guardado.</p>
        </div>
      </div>

      <LocaisCliente locais={locais ?? []} podeGerenciar={!!podeGerenciar} />
    </div>
  );
}
