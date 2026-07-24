import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { editarRelatorio } from "@/modules/squadframe/actions/documentos/actions";
import { RelatorioFiltrosForm } from "@/modules/squadframe/components/documentos/relatorio-filtros-form";
import type { StatusPedido } from "@/modules/squadframe/types/compras";

export const dynamic = "force-dynamic";

export default async function EditarRelatorioPage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar = !!(
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR)
  );
  if (!podeGerenciar) redirect("/squadframe/documentos");

  const admin = createAdminClient();
  const [{ data: relatorio }, { data: obras }, { data: fornecedores }] = await Promise.all([
    admin.from("relatorios").select("id, nome, filtros").eq("id", params.id).maybeSingle(),
    admin.from("obras").select("id, nome").order("nome").limit(200),
    admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  if (!relatorio) notFound();

  const filtros = (relatorio.filtros ?? {}) as {
    data_inicio?: string;
    data_fim?: string;
    obra_id?: string;
    fornecedor_id?: string;
    status?: StatusPedido;
  };

  const editarComId = editarRelatorio.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Editar relatório</h1>
      <p className="text-sm text-text-3 mt-1">Ajuste os filtros e regenere o documento.</p>

      <RelatorioFiltrosForm
        action={editarComId}
        obras={obras ?? []}
        fornecedores={fornecedores ?? []}
        valoresIniciais={{
          nome: relatorio.nome,
          dataInicio: filtros.data_inicio,
          dataFim: filtros.data_fim,
          obraId: filtros.obra_id,
          fornecedorId: filtros.fornecedor_id,
          status: filtros.status,
        }}
        tituloSubmit="Salvar e regerar"
      />
    </div>
  );
}
