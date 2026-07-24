import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { Button } from "@/ui/components/Button";
import { excluirRelatorio } from "@/modules/squadframe/actions/documentos/actions";

export const dynamic = "force-dynamic";

interface RelatorioRow {
  id: string;
  tipo: string;
  nome: string;
  filtros: { data_inicio?: string; data_fim?: string } | null;
  criado_em: string;
  autor: { nome: string } | { nome: string }[] | null;
}

function nomeDaRelacao(v: { nome: string } | { nome: string }[] | null): string {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? "—";
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function DocumentosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar = !!(
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR)
  );

  const admin = createAdminClient();
  const { data } = await admin
    .from("relatorios")
    .select("id, tipo, nome, filtros, criado_em, autor:usuarios(nome)")
    .order("criado_em", { ascending: false });

  const relatorios = (data ?? []) as unknown as RelatorioRow[];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-sm text-text-3 mt-1">Relatórios gerados a partir dos dados do sistema.</p>
        </div>
        {podeGerenciar && (
          <Link href="/squadframe/documentos/novo">
            <Button>Novo relatório</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-3">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 font-medium">Período</th>
              <th className="text-left px-4 py-2.5 font-medium">Criado por</th>
              <th className="text-left px-4 py-2.5 font-medium">Criado em</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {relatorios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-3">
                  Nenhum relatório criado ainda.
                </td>
              </tr>
            )}
            {relatorios.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-2/50">
                <td className="px-4 py-2.5">
                  <Link href={`/squadframe/documentos/${r.id}`} className="font-medium text-primary hover:underline">
                    {r.nome}
                  </Link>
                </td>
                <td className="px-4 py-2.5 capitalize">{r.tipo}</td>
                <td className="px-4 py-2.5">
                  {r.filtros?.data_inicio && r.filtros?.data_fim
                    ? `${formatarData(r.filtros.data_inicio)} – ${formatarData(r.filtros.data_fim)}`
                    : "—"}
                </td>
                <td className="px-4 py-2.5">{nomeDaRelacao(r.autor)}</td>
                <td className="px-4 py-2.5">{formatarData(r.criado_em)}</td>
                <td className="px-4 py-2.5 text-right">
                  {podeGerenciar && (
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/squadframe/documentos/${r.id}/editar`} className="text-text-3 hover:text-text text-xs">
                        Editar
                      </Link>
                      <form action={excluirRelatorio.bind(null, r.id)}>
                        <button type="submit" className="text-danger hover:underline text-xs">
                          Excluir
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
