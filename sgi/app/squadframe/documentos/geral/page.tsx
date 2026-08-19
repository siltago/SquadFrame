import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { Button } from "@/ui/components/Button";
import { gerarRelatorioPedidos } from "@/modules/squadframe/services/relatorios/relatorio-pedidos";
import { RelatorioPedidosDocumento } from "@/modules/squadframe/components/documentos/relatorio-pedidos-documento";

export const dynamic = "force-dynamic";

function primeiroDiaDoMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatarDataCurta(iso: string): string {
  return new Date(`${iso}T00:00:00-03:00`).toLocaleDateString("pt-BR");
}

export default async function RelatorioGeralPage({
  searchParams,
}: {
  searchParams: { data_inicio?: string; data_fim?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  if (!podeGerar) redirect("/squadframe/documentos");

  const dataInicio = searchParams.data_inicio;
  const dataFim = searchParams.data_fim;
  const admin = createAdminClient();

  if (dataInicio && dataFim) {
    const [dados, { data: emp }] = await Promise.all([
      gerarRelatorioPedidos(admin, { dataInicio, dataFim }),
      admin.from("empresa").select("*").eq("id", "default").maybeSingle(),
    ]);

    return (
      <RelatorioPedidosDocumento
        dados={dados}
        titulo="Relatório Geral de Compras"
        subtitulo={`${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}`}
        empresa={emp ?? {}}
        autorNome={usuario.nome}
        voltarHref="/squadframe/documentos/geral"
      />
    );
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Relatório Geral de Compras</h1>
      <p className="text-sm text-text-3 mt-1">Todos os pedidos do sistema no período escolhido. Não fica salvo — só imprima ou salve o PDF.</p>

      <form method="GET" className="mt-6 space-y-5 max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Data início</label>
            <input type="date" name="data_inicio" required defaultValue={primeiroDiaDoMes()} className="field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Data fim</label>
            <input type="date" name="data_fim" required defaultValue={hojeISO()} className="field w-full" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit">Gerar</Button>
        </div>
      </form>
    </div>
  );
}
