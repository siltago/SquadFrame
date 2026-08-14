import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-600",
  ATIVO: "bg-green-100 text-green-700",
  SUSPENSO: "bg-yellow-100 text-yellow-700",
  CONCLUIDO: "bg-blue-100 text-blue-700",
  CANCELADO: "bg-red-100 text-red-600",
};

type Pacote = {
  id: string; nome: string; codigo: string | null; status: string; prazo: string | null;
  obra: { nome: string } | { nome: string }[] | null;
};

// Lista todos os lotes de todas as obras — cada lote é tratado
// individualmente (sem agregar necessidades entre eles), só reúne o
// ponto de entrada pra abrir o painel de Compras de qualquer um. Visão
// consolidada por prioridade fica em Planejamento → Dashboard.
export default async function LotesComprasPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("lotes_obra")
    .select("id, nome, codigo, status, prazo, obra:obras(nome)")
    .order("criado_em", { ascending: false });
  const pacotes = (data ?? []) as unknown as Pacote[];

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher channelName="compras-lotes-lista" subs={[{ table: "lotes_obra" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lotes</h1>
        <p className="mt-1 text-sm text-text-2">
          {pacotes.length} lote(s) — vincule pedidos e gere pedidos a partir do levantamento de material de cada um.
        </p>
      </div>

      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Obra</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {pacotes.map((p) => {
              const obra = Array.isArray(p.obra) ? p.obra[0] ?? null : p.obra;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/squadframe/compras/lotes/${p.id}`} className="font-medium text-text hover:text-primary">
                      {p.nome}
                    </Link>
                    {p.codigo && <span className="ml-2 font-mono text-xs text-text-3">{p.codigo}</span>}
                  </td>
                  <td className="px-4 py-3 text-text-2">{obra?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[p.status] ?? ""}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-2">{p.prazo ? new Date(p.prazo).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              );
            })}
            {pacotes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-3">
                  Nenhum lote encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
