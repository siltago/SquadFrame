import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { Button } from "@/ui/components/Button";
import { RefreshIcon } from "@/ui/icons";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
};

const TIPO_BADGE: Record<string, string> = {
  ENTRADA: "bg-success-soft text-success-hover",
  SAIDA: "bg-warning-soft text-warning-hover",
  AJUSTE: "bg-info-soft text-info",
};

interface MovimentacaoRow {
  id: string;
  numero: string;
  tipo: string;
  quantidade: number;
  origem_tipo: string | null;
  observacoes: string | null;
  criado_em: string;
  produto: { codigo_mestre: string; nome: string; unidade: string | null } | { codigo_mestre: string; nome: string; unidade: string | null }[] | null;
  local: { nome: string } | { nome: string }[] | null;
  obra: { nome: string } | { nome: string }[] | null;
  cor: { codigo_ral: string } | { codigo_ral: string }[] | null;
  usuario: { nome: string } | { nome: string }[] | null;
}

function nomeRelacao<T extends { nome: string }>(v: T | T[] | null): string {
  const obj = Array.isArray(v) ? v[0] ?? null : v;
  return obj?.nome ?? "—";
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: { obra_id?: string; local_id?: string; tipo?: string; produto_id?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();
  const [{ data: obras }, { data: locais }] = await Promise.all([
    admin.from("obras").select("id, nome").order("nome").limit(200),
    admin.from("stock_locais").select("id, nome").order("nome"),
  ]);

  let q = admin
    .from("stock_movimentacoes")
    .select(`
      id, numero, tipo, quantidade, origem_tipo, observacoes, criado_em,
      produto:produtos(codigo_mestre, nome, unidade),
      local:stock_locais(nome),
      obra:obras(nome),
      cor:cores_ral(codigo_ral),
      usuario:usuarios(nome)
    `)
    .order("criado_em", { ascending: false })
    .limit(200);

  if (searchParams.obra_id) q = q.eq("obra_id", searchParams.obra_id);
  if (searchParams.local_id) q = q.eq("local_id", searchParams.local_id);
  if (searchParams.produto_id) q = q.eq("produto_id", searchParams.produto_id);
  if (searchParams.tipo) q = q.eq("tipo", searchParams.tipo);

  const { data } = await q;
  const movimentacoes = (data ?? []) as unknown as MovimentacaoRow[];

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
            <RefreshIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Movimentações</h1>
            <p className="text-sm text-text-3">Histórico de entradas, saídas e ajustes de estoque.</p>
          </div>
        </div>
        <Link href="/squadstock/movimentacoes/nova">
          <Button>Nova movimentação</Button>
        </Link>
      </div>

      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Local</label>
          <select name="local_id" defaultValue={searchParams.local_id ?? ""} className="field h-9 text-sm">
            <option value="">Todos</option>
            {(locais ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Obra</label>
          <select name="obra_id" defaultValue={searchParams.obra_id ?? ""} className="field h-9 text-sm">
            <option value="">Todas</option>
            {(obras ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="field h-9 text-sm">
            <option value="">Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>
        <Button type="submit" size="sm">Filtrar</Button>
      </form>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-3">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Número</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Produto</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Local</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Obra</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Tipo</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Quantidade</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Usuário</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Data</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-text-3">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
            {movimentacoes.map((m) => {
              const p = Array.isArray(m.produto) ? m.produto[0] : m.produto;
              const cor = Array.isArray(m.cor) ? m.cor[0] : m.cor;
              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-2.5 text-text-3 font-mono text-xs">{m.numero}</td>
                  <td className="px-4 py-2.5">
                    {p?.nome ?? "—"}
                    {cor && <span className="ml-1.5 text-xs text-text-3">({cor.codigo_ral})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-text-2">{nomeRelacao(m.local)}</td>
                  <td className="px-4 py-2.5 text-text-2">{m.obra ? nomeRelacao(m.obra) : <span className="text-text-3">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${TIPO_BADGE[m.tipo] ?? "bg-surface-2 text-text-2"}`}>
                      {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${m.quantidade < 0 ? "text-danger" : "text-success"}`}>
                    {m.quantidade > 0 ? "+" : ""}
                    {m.quantidade}
                  </td>
                  <td className="px-4 py-2.5">{nomeRelacao(m.usuario)}</td>
                  <td className="px-4 py-2.5 text-text-3">{formatarData(m.criado_em)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
