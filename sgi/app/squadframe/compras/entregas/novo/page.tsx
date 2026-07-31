import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { NovoRomaneioCliente } from "@/modules/squadframe/components/compras/novo-romaneio-cliente";

export const dynamic = "force-dynamic";

export default async function NovoRomaneioPage() {
  const admin = createAdminClient();

  const { data: fornecedores } = await admin
    .from("fornecedores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl">
      <BackButton href="/squadframe/compras/entregas" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Novo romaneio</h1>
      <p className="mt-1 text-sm text-text-2">
        Anexe o PDF do romaneio — o sistema tenta identificar número, data, fornecedor e os pedidos
        vinculados. Revise e ajuste antes de confirmar.
      </p>

      <div className="mt-6">
        <NovoRomaneioCliente fornecedores={fornecedores ?? []} />
      </div>
    </div>
  );
}
