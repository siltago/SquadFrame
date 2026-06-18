import { createAdminClient } from "@/lib/supabase-admin";
import { NovaSolicitacaoCliente } from "./nova-solicitacao-cliente";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovaSolicitacaoPage() {
  const admin = createAdminClient();
  const { data: obras } = await admin
    .from("obras")
    .select("id, nome, codigo")
    .order("nome");

  return (
    <div className="px-8 py-8 max-w-4xl">
      <BackButton href="/compras/solicitacoes" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Nova Solicitação de Compra</h1>
      <p className="mt-1 text-sm text-ink-soft">Todos os itens devem vir do catálogo de produtos.</p>
      <div className="mt-6">
        <NovaSolicitacaoCliente obras={obras ?? []} />
      </div>
    </div>
  );
}
