import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { criarRelatorio } from "@/modules/squadframe/actions/documentos/actions";
import { RelatorioFiltrosForm } from "@/modules/squadframe/components/documentos/relatorio-filtros-form";

export const dynamic = "force-dynamic";

export default async function NovoRelatorioPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar = !!(
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR)
  );
  if (!podeGerenciar) redirect("/squadframe/documentos");

  const admin = createAdminClient();
  const [{ data: obras }, { data: fornecedores }] = await Promise.all([
    admin.from("obras").select("id, nome").order("nome").limit(200),
    admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Novo relatório</h1>
      <p className="text-sm text-text-3 mt-1">Relatório de Pedidos — agregado de todos os pedidos do sistema no período.</p>

      <RelatorioFiltrosForm
        action={criarRelatorio}
        obras={obras ?? []}
        fornecedores={fornecedores ?? []}
        tituloSubmit="Criar e gerar"
      />
    </div>
  );
}
