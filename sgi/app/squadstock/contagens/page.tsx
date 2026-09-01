import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { Button } from "@/ui/components/Button";
import { CheckSquareIcon, PlusIcon } from "@/ui/icons";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { buscarLocaisComCaminho } from "@/modules/squadstock/lib/locais-com-caminho";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  EM_CONTAGEM: "Em contagem",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};
const STATUS_CLASSE: Record<string, string> = {
  ABERTA: "bg-surface-3 text-text-2",
  EM_CONTAGEM: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONCLUIDA: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELADA: "bg-danger-soft text-danger",
};

export default async function ContagensPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);

  const admin = createAdminClient();
  const [{ data: contagens }, locais] = await Promise.all([
    admin
      .from("stock_contagens")
      .select("id, numero, modo, status, criado_em, concluido_em, local_raiz_id, itens:stock_contagem_itens(count)")
      .order("criado_em", { ascending: false })
      .limit(100),
    buscarLocaisComCaminho(admin, { apenasAtivos: false }),
  ]);
  const caminhoPorLocal = new Map(locais.map((l) => [l.id, l.caminho]));

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
            <CheckSquareIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contagens de estoque</h1>
            <p className="text-sm text-text-3">Sessões de conferência física por local — papel ou direto no sistema.</p>
          </div>
        </div>
        {podeGerenciar && (
          <Link href="/squadstock/contagens/nova">
            <Button>
              <PlusIcon size={16} />
              Nova contagem
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(!contagens || contagens.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-text-3">Nenhuma contagem criada ainda.</p>
        )}
        {contagens?.map((c) => {
          const localRaiz = caminhoPorLocal.get(c.local_raiz_id) ?? "—";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalItens = (c.itens as any)?.[0]?.count ?? 0;
          return (
            <Link
              key={c.id}
              href={`/squadstock/contagens/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">{c.numero}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSE[c.status] ?? ""}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">
                    {c.modo}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-text-3">
                  {localRaiz} · {totalItens} {totalItens === 1 ? "item" : "itens"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-text-3">
                {new Date(c.criado_em).toLocaleDateString("pt-BR")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
