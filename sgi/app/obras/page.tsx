import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { StatusBadge } from "@/components/status-badge";
import { Paginacao } from "@/components/paginacao";
import { getUsuarioAtual } from "@/lib/auth";
import { BtnAcaoProtegida } from "@/components/btn-acao-protegida";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

export default async function ObrasPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createAdminClient();
  const usuario = await getUsuarioAtual();
  const podeCriar = usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes("obras.criar") || false;
  const pagina = Math.max(1, parseInt(searchParams.page ?? "1"));
  const from = (pagina - 1) * POR_PAGINA;

  const { data: obras, count } = await supabase
    .from("obras")
    .select(
      `id, codigo, numero, nome, cidade, estado, data_prevista,
       cliente:clientes(nome),
       status:obra_status(nome, cor)`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("criado_em", { ascending: false })
    .range(from, from + POR_PAGINA - 1);

  return (
    <div className="px-8 py-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
            Operação
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Obras</h1>
        </div>
        <BtnAcaoProtegida href="/obras/nova" label="Nova obra" temPermissao={podeCriar} acao="criar obras" className="btn-primary" />
      </div>

      {/* Lista */}
      {!obras || obras.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">
            Nenhuma obra ainda
          </p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Toda informação do sistema vive dentro de uma obra. Crie a primeira
            para começar.
          </p>
          <BtnAcaoProtegida href="/obras/nova" label="Criar primeira obra" temPermissao={podeCriar} acao="criar obras" className="btn-primary mt-5" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Obra</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Local</th>
                <th className="px-5 py-3 font-medium">Entrega</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o: any) => (
                <tr
                  key={o.id}
                  className="border-b border-line last:border-0 transition-colors hover:bg-canvas"
                >
                  <td className="px-5 py-3">
                    <Link href={`/obras/${o.id}`} className="flex flex-col hover:underline">
                      {o.numero && (
                        <span className="font-mono text-xs font-bold text-steel">
                          {String(o.numero).padStart(4, "0")}
                        </span>
                      )}
                      <span className="font-mono text-xs text-ink-faint">{o.codigo}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium">{o.nome}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {o.cliente?.nome ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {o.cidade ? `${o.cidade}/${o.estado ?? ""}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {o.data_prevista
                      ? new Date(o.data_prevista).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {o.status && (
                      <StatusBadge nome={o.status.nome} cor={o.status.cor} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacao
            paginaAtual={pagina}
            total={count ?? 0}
            porPagina={POR_PAGINA}
            buildUrl={(p) => `/obras?page=${p}`}
          />
        </div>
      )}
    </div>
  );
}
