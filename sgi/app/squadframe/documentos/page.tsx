import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";

export const dynamic = "force-dynamic";

function CardTipo({ href, titulo, descricao }: { href: string; titulo: string; descricao: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border p-5 hover:border-primary hover:bg-surface-2/50 transition-colors"
    >
      <p className="font-semibold text-text">{titulo}</p>
      <p className="text-sm text-text-3 mt-1">{descricao}</p>
    </Link>
  );
}

// Documentos não ficam salvos — cada tipo é gerado na hora a partir dos
// filtros escolhidos, e o usuário imprime ou salva o PDF direto da tela.
export default async function DocumentosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  if (!podeGerar) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-danger">Sem permissão para gerar relatórios.</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
      <p className="text-sm text-text-3 mt-1">Escolha o tipo de relatório.</p>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <CardTipo
          href="/squadframe/documentos/geral"
          titulo="Relatório Geral de Compras"
          descricao="Todos os pedidos do sistema num período — você só escolhe a data de início e fim."
        />
        <CardTipo
          href="/squadframe/documentos/obra"
          titulo="Relatório por Obra"
          descricao="Total histórico de uma obra específica — você só escolhe a obra, sem recorte de tempo."
        />
      </div>
    </div>
  );
}
