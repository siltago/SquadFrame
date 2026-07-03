import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { AbaGeral } from "@/modules/squadframe/components/catalogo/aba-geral";
import { AbaCores } from "@/modules/squadframe/components/catalogo/aba-cores";
import { AbaAliases } from "@/modules/squadframe/components/catalogo/aba-aliases";
import { AbaArquivos } from "@/modules/squadframe/components/catalogo/aba-arquivos";

export const dynamic = "force-dynamic";

export default async function ProdutoPage({
  params,
  searchParams,
}: {
  params: { linhaId: string; produtoId: string };
  searchParams: { aba?: string };
}) {
  const abaAtiva = searchParams.aba ?? "geral";
  const supabase = createClient();

  const { data: produto } = await supabase
    .from("produtos")
    .select(
      `id, codigo_mestre, nome, unidade, status, descricao, observacoes, fornecedor_mestre_id,
       peso_metro, preco_metro, tamanho_mm,
       linha:linhas(nome, fabricante, tipo),
       categoria:categorias_perfil(id, nome)`
    )
    .eq("id", params.produtoId)
    .eq("linha_id", params.linhaId)
    .single();

  if (!produto) notFound();

  const linha = produto.linha as unknown as { nome: string; fabricante: string | null; tipo: string | null } | null;
  const categoria = produto.categoria as unknown as { nome: string } | null;

  // Unidade do tipo desta aba (para labels dinâmicos de specs)
  let tipoUnidade: string | null = null;
  if (linha?.tipo) {
    const { data: tipoData, error: tipoErr } = await supabase
      .from("tipos_linha").select("unidade").eq("slug", linha.tipo).maybeSingle();
    if (!tipoErr) tipoUnidade = tipoData?.unidade ?? null;
  }

  const { count: arquivoCount } = await supabase
    .from("produto_arquivos")
    .select("*", { count: "exact", head: true })
    .eq("produto_id", params.produtoId);

  const abas = [
    { label: "Geral",   slug: "geral" },
    { label: "Cores",   slug: "cores" },
    { label: "Aliases", slug: "aliases" },
    { label: arquivoCount ? `Arquivos (${arquivoCount})` : "Arquivos", slug: "arquivos" },
  ];

  // ── Dados por aba ───────────────────────────────────────────

  let cores: any[] = [];
  let coresDisponiveis: any[] = [];
  let acabamentos: any[] = [];
  let aliases: any[] = [];
  let fornecedoresDisponiveis: any[] = [];
  let arquivos: any[] = [];

  // Fornecedores sempre carregados (usados em Geral e Aliases)
  const [{ data: fDisp }, { data: linhasDoTipo }, ] = await Promise.all([
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    linha?.tipo
      ? supabase.from("linhas").select("id, nome").eq("tipo", linha.tipo).eq("ativo", true).order("nome")
      : { data: [] },
  ]);
  fornecedoresDisponiveis = fDisp ?? [];
  const linhasDisponiveis = linhasDoTipo ?? [];

  // Categorias de todas as linhas do mesmo tipo (para o select em aba-geral)
  let todasCategorias: { id: string; nome: string; linha_id: string }[] = [];
  if (linhasDisponiveis.length > 0) {
    const linhaIds = linhasDisponiveis.map((l) => l.id);
    const { data: cats } = await supabase
      .from("categorias_perfil")
      .select("id, nome, linha_id")
      .in("linha_id", linhaIds)
      .order("nome");
    todasCategorias = cats ?? [];
  }

  if (abaAtiva === "cores") {
    const results = await Promise.all([
      supabase
        .from("produto_cores")
        .select("cor:cores_ral(id, codigo_ral, nome, hex), acabamento:acabamentos(id, nome)")
        .eq("produto_id", params.produtoId)
        .order("cor_id"),
      supabase.from("cores_ral").select("id, codigo_ral, nome, hex").order("codigo_ral"),
      supabase.from("acabamentos").select("id, nome").order("nome"),
    ]);
    cores = results[0].data ?? [];
    coresDisponiveis = results[1].data ?? [];
    acabamentos = results[2].data ?? [];
  }

  if (abaAtiva === "aliases") {
    const { data: al } = await supabase
      .from("produto_aliases")
      .select("id, alias, peso_metro, preco_metro, tamanho_mm, preco_kg, fornecedor:fornecedores(id, nome)")
      .eq("produto_id", params.produtoId)
      .order("alias");
    aliases = al ?? [];
  }

  if (abaAtiva === "arquivos") {
    const { data } = await supabase
      .from("produto_arquivos")
      .select("id, nome_original, url, url_preview, tipo, criado_em")
      .eq("produto_id", params.produtoId)
      .order("criado_em", { ascending: false });
    arquivos = data ?? [];
  }

  return (
    <div className="px-8 py-8">
      <BackButton href={linha?.tipo ? `/squadframe/catalogo?tipo=${linha.tipo.toLowerCase()}` : `/squadframe/catalogo/${params.linhaId}`} />

      {/* Cabeçalho */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-medium text-text-3">
            {produto.codigo_mestre}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              produto.status ? "bg-success-soft text-success" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${produto.status ? "bg-green-500" : "bg-slate-400"}`} />
            {produto.status ? "Ativo" : "Inativo"}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{produto.nome}</h1>
        <p className="mt-1 text-sm text-text-2">
          {linha?.nome}
          {categoria?.nome ? ` · ${categoria.nome}` : ""}
          {` · ${produto.unidade}`}
        </p>
      </div>

      {/* Navegação de abas */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {abas.map(({ label, slug }) => (
          <Link
            key={slug}
            href={`/squadframe/catalogo/${params.linhaId}/${params.produtoId}?aba=${slug}`}
            className={
              abaAtiva === slug
                ? "shrink-0 border-b-2 border-primary px-4 py-2.5 text-sm font-medium text-text"
                : "shrink-0 px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2"
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Aba: Geral ─────────────────────────────────────── */}
      {abaAtiva === "geral" && (
        <AbaGeral
          produto={{ ...produto, linha, categoria } as any}
          linhaId={params.linhaId}
          tipoUnidade={tipoUnidade}
          fornecedoresDisponiveis={fornecedoresDisponiveis}
          linhasDisponiveis={linhasDisponiveis}
          todasCategorias={todasCategorias}
        />
      )}

      {/* ── Aba: Cores ─────────────────────────────────────── */}
      {abaAtiva === "cores" && (
        <AbaCores
          produtoId={params.produtoId}
          linhaId={params.linhaId}
          cores={cores}
          coresDisponiveis={coresDisponiveis}
          acabamentos={acabamentos}
        />
      )}

      {/* ── Aba: Aliases ───────────────────────────────────── */}
      {abaAtiva === "aliases" && (
        <AbaAliases
          produtoId={params.produtoId}
          linhaId={params.linhaId}
          aliases={aliases}
          tipoUnidade={tipoUnidade}
          fornecedoresDisponiveis={fornecedoresDisponiveis}
          masterPeso={produto.peso_metro ?? null}
          masterTamanho={produto.tamanho_mm ?? null}
        />
      )}

      {/* ── Aba: Arquivos ──────────────────────────────────── */}
      {abaAtiva === "arquivos" && (
        <AbaArquivos
          produtoId={params.produtoId}
          linhaId={params.linhaId}
          arquivos={arquivos}
        />
      )}
    </div>
  );
}
