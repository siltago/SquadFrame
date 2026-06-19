import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { AbaCoresCatalogo } from "./aba-cores-catalogo";
import { NovaAbaInline } from "./nova-aba-inline";
import { GerenciarAba } from "./gerenciar-aba";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: { aba?: string };
}) {
  const supabase = createAdminClient();
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("catalogo.criar") ||
    false;

  // Carrega tipos de linha do banco (abas dinâmicas)
  const { data: tipos, error: tiposErr } = await supabase
    .from("tipos_linha")
    .select("id, nome, slug, unidade")
    .order("ordem");

  // Fallback se coluna unidade ainda não existir no banco
  const tiposList = tiposErr
    ? ((await supabase.from("tipos_linha").select("id, nome, slug").order("ordem")).data ?? [])
    : (tipos ?? []);

  // Determina aba ativa: slug de um tipo ou "cores" (sempre última)
  const slugsValidos = tiposList.map((t) => t.slug);
  const aba =
    searchParams.aba === "cores"
      ? "cores"
      : slugsValidos.find((s) => s === searchParams.aba) ?? tiposList[0]?.slug ?? "cores";

  let linhas: any[] = [];
  let cores: any[] = [];

  if (aba !== "cores") {
    const { data } = await supabase
      .from("linhas")
      .select("id, nome, fabricante, produtos(count)")
      .eq("ativo", true)
      .eq("tipo", aba)
      .order("nome");
    linhas = data ?? [];
  } else {
    const { data: coresData } = await supabase
      .from("cores_ral")
      .select("id, codigo_ral, nome, hex, tipos")
      .order("codigo_ral");
    cores = coresData ?? [];
  }

  const tipoAtual = tiposList.find((t) => t.slug === aba);
  const labelNova = tipoAtual ? `Nova linha de ${tipoAtual.nome.toLowerCase()}` : "Nova linha";

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
            Catálogo
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {aba === "cores" ? "Cores RAL" : (tipoAtual?.nome ?? "Catálogo")}
            </h1>
            {tipoAtual && (tipoAtual as any).unidade && (tipoAtual as any).unidade !== "UN" && (
              <span className="rounded-full bg-steel/10 px-2.5 py-0.5 text-xs font-medium text-steel">
                {(tipoAtual as any).unidade}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aba !== "cores" && tipoAtual && (
            <GerenciarAba aba={tipoAtual as { id: string; nome: string; slug: string; unidade?: string | null }} />
          )}
          <NovaAbaInline />
          {aba !== "cores" && podeCriar && (
            <Link href={`/catalogo/nova-linha?tipo=${aba}`} className="btn-primary">
              {labelNova}
            </Link>
          )}
        </div>
      </div>

      {/* ── Linhas ─────────────────────────────────────────────── */}
      {aba !== "cores" && (
        <div className="mt-8">
          {linhas.length === 0 ? (
            <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold">
                Nenhuma linha cadastrada
              </p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">
                Linhas agrupam {tipoAtual?.nome.toLowerCase() ?? "itens"} por série ou fabricante.
              </p>
              {podeCriar && (
                <Link
                  href={`/catalogo/nova-linha?tipo=${aba}`}
                  className="btn-primary mt-5"
                >
                  {labelNova}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {linhas.map((linha: any) => {
                const qtd =
                  (linha.produtos as Array<{ count: number }>)?.[0]?.count ?? 0;
                return (
                  <Link
                    key={linha.id}
                    href={`/catalogo/${linha.id}`}
                    className="card p-5 transition-all hover:border-steel/20 hover:shadow-md"
                  >
                    <p className="font-display text-base font-semibold text-ink">
                      {linha.nome}
                    </p>
                    {linha.fabricante && (
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {linha.fabricante}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-ink-faint">
                      {qtd} {qtd === 1 ? "produto" : "produtos"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Cores RAL ──────────────────────────────────────────── */}
      {aba === "cores" && <AbaCoresCatalogo cores={cores} tiposLinha={tiposList as any} />}
    </div>
  );
}
