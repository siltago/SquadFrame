import { createAdminClient } from "@/shared/database/supabase-admin";
import { NovaSolicitacaoCliente } from "@/modules/squadframe/components/compras/nova-solicitacao-cliente";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovaSolicitacaoPage() {
  const admin = createAdminClient();
  const [{ data: obras }, { data: coresRal }] = await Promise.all([
    admin.from("obras").select("id, nome, codigo").is("deleted_at", null).order("nome"),
    admin.from("cores_ral").select("id, codigo_ral, nome, tipos").order("codigo_ral"),
  ]);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <BackButton href="/squadframe/compras/solicitacoes" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Nova Solicitação de Compra</h1>
      <p className="mt-1 text-sm text-text-2">Todos os itens devem vir do catálogo de produtos.</p>
      <div className="mt-6">
        <NovaSolicitacaoCliente obras={obras ?? []} coresRal={coresRal ?? []} />
      </div>
    </div>
  );
}
