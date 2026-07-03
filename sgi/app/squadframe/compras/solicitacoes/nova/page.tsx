import { createAdminClient } from "@/shared/database/supabase-admin";
import { NovaSolicitacaoCliente } from "@/modules/squadframe/components/compras/nova-solicitacao-cliente";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovaSolicitacaoPage({
  searchParams,
}: {
  searchParams: { obra_id?: string; lote_id?: string; origem_contexto?: string };
}) {
  const admin = createAdminClient();
  const [{ data: obras }, { data: coresRal }, loteRes] = await Promise.all([
    admin.from("obras").select("id, nome, codigo").is("deleted_at", null).order("nome"),
    admin.from("cores_ral").select("id, codigo_ral, nome, tipos").order("codigo_ral"),
    searchParams.lote_id
      ? admin.from("lotes_obra").select("id, nome").eq("id", searchParams.lote_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const backHref = searchParams.obra_id
    ? `/squadframe/obras/${searchParams.obra_id}?aba=producao`
    : "/squadframe/compras/solicitacoes";

  return (
    <div className="px-8 py-8 max-w-4xl">
      <BackButton href={backHref} />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Nova Solicitação de Compra</h1>
      <p className="mt-1 text-sm text-text-2">Todos os itens devem vir do catálogo de produtos.</p>
      <div className="mt-6">
        <NovaSolicitacaoCliente
          obras={obras ?? []}
          coresRal={coresRal ?? []}
          defaultObraId={searchParams.obra_id}
          loteId={searchParams.lote_id}
          loteNome={loteRes.data?.nome}
          origemContexto={searchParams.origem_contexto}
        />
      </div>
    </div>
  );
}
