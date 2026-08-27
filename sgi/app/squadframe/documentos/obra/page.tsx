import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { Button } from "@/ui/components/Button";
import { FilterBar } from "@/ui/components/FilterBar";
import { gerarRelatorioPedidos } from "@/modules/squadframe/services/relatorios/relatorio-pedidos";
import { RelatorioPedidosDocumento } from "@/modules/squadframe/components/documentos/relatorio-pedidos-documento";

export const dynamic = "force-dynamic";

export default async function RelatorioPorObraPage({
  searchParams,
}: {
  searchParams: { obra_id?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  if (!podeGerar) redirect("/squadframe/documentos");

  const admin = createAdminClient();
  const obraId = searchParams.obra_id;

  if (obraId) {
    const [dados, { data: emp }, { data: obra }] = await Promise.all([
      gerarRelatorioPedidos(admin, { obraId }),
      admin.from("empresa").select("*").eq("id", "default").maybeSingle(),
      admin.from("obras").select("nome").eq("id", obraId).maybeSingle(),
    ]);

    return (
      <RelatorioPedidosDocumento
        dados={dados}
        titulo={`Relatório de Pedidos — ${obra?.nome ?? "Obra"}`}
        subtitulo="Total histórico"
        empresa={emp ?? {}}
        autorNome={usuario.nome}
        voltarHref="/squadframe/documentos/obra"
      />
    );
  }

  const { data: obras } = await admin.from("obras").select("id, nome").order("nome").limit(200);

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Relatório por Obra</h1>
      <p className="text-sm text-text-3 mt-1">Total histórico de compras de uma obra específica. Não fica salvo — só imprima ou salve o PDF.</p>

      <FilterBar method="GET" className="mt-6 max-w-xl">
        <div className="min-w-[220px] flex-1">
          <label className="label">Obra</label>
          <select name="obra_id" required defaultValue="" className="field h-9 w-full text-sm">
            <option value="" disabled>
              Selecione uma obra
            </option>
            {(obras ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="accent" className="h-9 shrink-0 text-sm">Gerar</Button>
      </FilterBar>
    </div>
  );
}
