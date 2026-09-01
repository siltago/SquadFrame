import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { WarehouseIcon } from "@/ui/icons";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { MapaArvore } from "@/modules/squadstock/components/mapa/mapa-arvore";
import { calcularSugestoesFrequencia } from "@/modules/squadstock/services/frequencia-contagem";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.MAPA_GERENCIAR);

  const admin = createAdminClient();
  // "Não alocado" (especial=true) fica fora da árvore visual — continua
  // existindo só como destino automático de recebimento não mapeado.
  const [{ data: locais }, sugestoes] = await Promise.all([
    admin
      .from("stock_locais")
      .select("id, nome, nivel_tipo, parent_id, ordem, ativo")
      .eq("ativo", true)
      .eq("especial", false)
      .order("ordem"),
    calcularSugestoesFrequencia(admin),
  ]);
  // Map não é um tipo serializável entre Server e Client Component — passa
  // como objeto plano (id → sugestão), reconstrução vira um Map lookup
  // trivial dentro do componente client.
  const sugestoesPorLocal = Object.fromEntries(sugestoes);

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
          <WarehouseIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapa de estoque</h1>
          <p className="text-sm text-text-3">Galpão, sala, corredor, prateleira, nível… monte a estrutura física em até 10 níveis.</p>
        </div>
      </div>

      <MapaArvore locais={locais ?? []} podeGerenciar={!!podeGerenciar} sugestoes={sugestoesPorLocal} />
    </div>
  );
}
