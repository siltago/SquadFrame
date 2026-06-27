import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { AbaCoresCatalogo } from "./aba-cores-catalogo";
import { NovaAbaInline } from "./nova-aba-inline";
import { GerenciarAba } from "./gerenciar-aba";
import { FilterBar } from "./filter-bar";
import { GerenciarFornecedores } from "./gerenciar-fornecedores";
import { GerenciarLinhas } from "./gerenciar-linhas";
import { GerenciarCategorias } from "./gerenciar-categorias";
import type { CatalogItem } from "./catalog-item";
import type { Filters } from "./filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function buildFilterUrl(
  base: Record<string, string>,
  key: string,
  value: string
): string {
  const next = { ...base, [key]: value };
  delete next.pagina;
  return `/catalogo?${new URLSearchParams(next).toString()}`;
}

function buildPageUrl(base: Record<string, string>, pagina: number): string {
  const next = { ...base };
  if (pagina > 1) next.pagina = String(pagina);
  else delete next.pagina;
  return `/catalogo?${new URLSearchParams(next).toString()}`;
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: {
    tipo?: string;
    aba?: string;
    fornecedor?: string;
    linha?: string;
    categoria?: string;
    q?: string;
    status?: string;
    ordem?: string;
    pagina?: string;
    gerenciar?: string;
  };
}) {
  const supabase = createAdminClient();
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("catalogo.criar") ||
    false;
  const gerenciar = searchParams.gerenciar?.trim() ?? "";

  // Carrega tipos de linha
  const { data: tiposRaw, error: tiposErr } = await supabase
    .from("tipos_linha")
    .select("id, nome, slug, unidade")
    .order("ordem");
  const tiposList = tiposErr
    ? ((await supabase.from("tipos_linha").select("id, nome, slug").order("ordem")).data ?? [])
    : (tiposRaw ?? []);

  // Determina tipo ativo — aceita ?tipo= (novo) e ?aba= (compat)
  const tipoParam = (searchParams.tipo ?? searchParams.aba ?? "").toUpperCase();
  const slugsValidos = tiposList.map((t) => t.slug);
  const tipoSlug =
    tipoParam === "CORES"
      ? "cores"
      : slugsValidos.find((s) => s === tipoParam) ?? tiposList[0]?.slug ?? "";
  const tipoAtual = tiposList.find((t) => t.slug === tipoSlug);

  // ── Aba Cores RAL ────────────────────────────────────────────
  if (tipoSlug === "cores") {
    const { data: cores } = await supabase
      .from("cores_ral")
      .select("id, codigo_ral, nome, hex, tipos")
      .order("codigo_ral");
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">Catálogo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Cores RAL</h1>
          </div>
          <NovaAbaInline />
        </div>
        <AbaCoresCatalogo cores={cores ?? []} tiposLinha={tiposList as any} />
      </div>
    );
  }

  if (!tipoSlug) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <p className="mt-8 text-sm text-ink-soft">Nenhuma aba cadastrada.</p>
      </div>
    );
  }

  // ── Filtros da URL ───────────────────────────────────────────
  const filtroFornecedor = searchParams.fornecedor?.trim() ?? "";
  const filtroLinha      = searchParams.linha?.trim() ?? "";
  const filtroCategoria  = searchParams.categoria?.trim() ?? "";
  const filtroQ          = searchParams.q?.trim() ?? "";
  const filtroStatus     = searchParams.status?.trim() ?? "";
  const filtroOrdem      = searchParams.ordem?.trim() ?? "";
  const pagina           = Math.max(1, parseInt(searchParams.pagina ?? "1") || 1);
  const offset           = (pagina - 1) * PAGE_SIZE;

  // Estado base dos filtros (passado para FilterBar e para buildFilterUrl)
  const baseParams: Record<string, string> = {
    tipo: tipoSlug.toLowerCase(),
    ...(filtroFornecedor ? { fornecedor: filtroFornecedor } : {}),
    ...(filtroLinha ? { linha: filtroLinha } : {}),
    ...(filtroCategoria ? { categoria: filtroCategoria } : {}),
    ...(filtroQ ? { q: filtroQ } : {}),
    ...(filtroStatus ? { status: filtroStatus } : {}),
    ...(filtroOrdem ? { ordem: filtroOrdem } : {}),
  };

  const currentFilters: Filters = {
    tipo: tipoSlug.toLowerCase(),
    q: filtroQ,
    fornecedor: filtroFornecedor,
    linha: filtroLinha,
    categoria: filtroCategoria,
    status: filtroStatus,
    ordem: filtroOrdem,
  };

  // ── Linhas do tipo ───────────────────────────────────────────
  const { data: todasLinhas } = await supabase
    .from("linhas")
    .select("id, nome, fabricante")
    .eq("tipo", tipoSlug)
    .eq("ativo", true)
    .order("nome");
  const linhasDoTipo = todasLinhas ?? [];

  // Fornecedores únicos para o FilterBar
  const fornecedoresDisponiveis = Array.from(
    new Set(linhasDoTipo.map((l) => l.fabricante).filter(Boolean))
  ).sort() as string[];

  // Linhas filtradas por fornecedor (dependência de filtro)
  const linhasFiltPorForn = filtroFornecedor
    ? linhasDoTipo.filter((l) => l.fabricante === filtroFornecedor)
    : linhasDoTipo;

  // IDs de linhas filtradas (aplica também filtro de linha específica)
  const linhaIdsFiltradas = filtroLinha
    ? linhasFiltPorForn.filter((l) => l.id === filtroLinha).map((l) => l.id)
    : linhasFiltPorForn.map((l) => l.id);

  const linhasDisponiveis = linhasFiltPorForn.map((l) => ({ id: l.id, nome: l.nome }));

  // ── Categorias disponíveis (dependem de linhas filtradas) ────
  const categoriasNomes: string[] = [];
  if (linhaIdsFiltradas.length > 0) {
    const { data: cats } = await supabase
      .from("categorias_perfil")
      .select("nome")
      .in("linha_id", linhaIdsFiltradas.slice(0, 200))
      .order("nome");
    const seen = new Set<string>();
    for (const c of cats ?? []) {
      if (!seen.has(c.nome)) { seen.add(c.nome); categoriasNomes.push(c.nome); }
    }
  }

  // ── Stats globais do tipo (sem filtros de produto) ───────────
  const totalLinhas       = linhasDoTipo.length;
  const totalFornecedores = fornecedoresDisponiveis.length;
  const totalCategorias   = categoriasNomes.length;

  // ── Query de produtos ────────────────────────────────────────
  let items: CatalogItem[] = [];
  let totalProdutos = 0;

  if (linhaIdsFiltradas.length > 0) {
    // Resolve IDs de categoria pelo nome (transversal entre linhas)
    let categoriaIds: string[] | null = null;
    if (filtroCategoria) {
      const { data: catRows } = await supabase
        .from("categorias_perfil")
        .select("id")
        .in("linha_id", linhaIdsFiltradas.slice(0, 200))
        .eq("nome", filtroCategoria);
      categoriaIds = (catRows ?? []).map((c) => c.id);
    }

    // Só executa a query de produtos se houver IDs de categoria válidos (ou sem filtro)
    const podeBuscar = !filtroCategoria || (categoriaIds !== null && categoriaIds.length > 0);

    if (podeBuscar) {
      let query = supabase
        .from("produtos")
        .select(
          `id, codigo_mestre, nome, unidade, status, linha_id,
           linha:linhas(id, nome, fabricante),
           categoria:categorias_perfil(id, nome),
           produto_arquivos(url_preview, is_principal)`,
          { count: "exact" }
        )
        .in("linha_id", linhaIdsFiltradas)
        .is("deleted_at", null);

      // Status
      if (filtroStatus === "inativo") query = query.eq("status", false);
      else if (filtroStatus === "todos") { /* sem filtro */ }
      else query = query.eq("status", true);

      // Categoria
      if (categoriaIds && categoriaIds.length > 0) {
        query = query.in("categoria_id", categoriaIds);
      }

      // Busca textual
      if (filtroQ) {
        query = query.or(`codigo_mestre.ilike.%${filtroQ}%,nome.ilike.%${filtroQ}%`);
      }

      // Ordenação
      if (filtroOrdem === "codigo") {
        query = query.order("codigo_mestre");
      } else if (filtroOrdem === "categoria") {
        query = query.order("categoria_id", { nullsFirst: false }).order("nome");
      } else {
        query = query.order("nome");
      }

      const { data: produtosRaw, count } = await query.range(offset, offset + PAGE_SIZE - 1);
      totalProdutos = count ?? 0;

      items = (produtosRaw ?? []).map((p) => {
        const linha     = (p.linha as any) ?? null;
        const categoria = (p.categoria as any) ?? null;
        const arquivos  = (p.produto_arquivos as any[]) ?? [];
        const previewUrl =
          arquivos.find((a: any) => a.is_principal && a.url_preview)?.url_preview ??
          arquivos.find((a: any) => a.url_preview)?.url_preview ??
          null;
        return {
          id: p.id,
          codigo: p.codigo_mestre,
          descricao: p.nome,
          fornecedor: linha?.fabricante ?? null,
          linha: linha ? { id: linha.id, nome: linha.nome } : null,
          categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null,
          status: p.status ?? false,
          unidade: p.unidade ?? "",
          previewUrl,
          href: `/catalogo/${p.linha_id}/${p.id}`,
        } satisfies CatalogItem;
      });
    }
  }

  // Paginação
  const totalPaginas = Math.ceil(totalProdutos / PAGE_SIZE);
  const hasFilters =
    filtroQ || filtroFornecedor || filtroLinha || filtroCategoria || filtroStatus;

  // ── Dados das views de gerenciamento (carregados apenas quando necessário) ────
  let fornecedoresGerenciar: any[] = [];
  let tiposLinhaGerenciar: { nome: string; slug: string }[] = [];
  let linhasComCategorias: { id: string; nome: string; fabricante: string | null; descricao: string | null; categorias: { id: string; nome: string; tipo: string }[] }[] = [];
  let linhasComProdutos: { id: string; nome: string; fabricante: string | null; descricao: string | null; _count: number }[] = [];

  if (gerenciar === "fornecedores") {
    const [{ data: fLista }, { data: tiposLista }] = await Promise.all([
      supabase.from("fornecedores").select(
        "id, nome, razao_social, cnpj, email, telefone, contato, ativo, tipos, endereco, numero, complemento, bairro, cidade, estado, cep"
      ).order("nome"),
      supabase.from("tipos_linha").select("nome, slug").order("ordem"),
    ]);
    fornecedoresGerenciar = fLista ?? [];
    tiposLinhaGerenciar = tiposLista ?? [];
  }

  if (gerenciar === "linhas") {
    const { data: linhasLista } = await supabase
      .from("linhas")
      .select("id, nome, fabricante, descricao")
      .eq("tipo", tipoSlug)
      .order("nome");
    const linhasIds = (linhasLista ?? []).map((l) => l.id);
    let contagens: Record<string, number> = {};
    if (linhasIds.length > 0) {
      const { data: countRows } = await supabase
        .from("produtos")
        .select("linha_id")
        .in("linha_id", linhasIds)
        .is("deleted_at", null);
      for (const r of countRows ?? []) {
        contagens[r.linha_id] = (contagens[r.linha_id] ?? 0) + 1;
      }
    }
    linhasComProdutos = (linhasLista ?? []).map((l) => ({ ...l, _count: contagens[l.id] ?? 0 }));
  }

  if (gerenciar === "categorias") {
    const { data: linhasLista } = await supabase
      .from("linhas")
      .select("id, nome, fabricante, descricao")
      .eq("tipo", tipoSlug)
      .order("nome");
    const linhasIds = (linhasLista ?? []).map((l) => l.id);
    let catsPorLinha: Record<string, { id: string; nome: string; tipo: string }[]> = {};
    if (linhasIds.length > 0) {
      const { data: catsLista } = await supabase
        .from("categorias_perfil")
        .select("id, nome, tipo, linha_id")
        .in("linha_id", linhasIds)
        .order("nome");
      for (const c of catsLista ?? []) {
        if (!catsPorLinha[c.linha_id]) catsPorLinha[c.linha_id] = [];
        catsPorLinha[c.linha_id].push({ id: c.id, nome: c.nome, tipo: c.tipo ?? "OUTROS" });
      }
    }
    linhasComCategorias = (linhasLista ?? []).map((l) => ({
      ...l,
      categorias: catsPorLinha[l.id] ?? [],
    }));
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">Catálogo</p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {tipoAtual?.nome ?? "Catálogo"}
            </h1>
            {(tipoAtual as any)?.unidade && (tipoAtual as any).unidade !== "UN" && (
              <span className="rounded-full bg-steel/10 px-2.5 py-0.5 text-xs font-medium text-steel">
                {(tipoAtual as any).unidade}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tipoAtual && (
            <GerenciarAba aba={tipoAtual as { id: string; nome: string; slug: string; unidade?: string | null }} />
          )}
          <NovaAbaInline />
          {podeCriar && (
            <Link
              href={`/catalogo/nova-linha?tipo=${tipoSlug.toLowerCase()}`}
              className="btn-secondary text-sm"
            >
              Nova linha
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard compacto — cards clicáveis para gerenciar */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={totalProdutos} label="produtos" filtered={!!hasFilters}
          href={`/catalogo?tipo=${tipoSlug.toLowerCase()}`}
          active={!gerenciar}
        />
        <StatCard
          value={totalFornecedores} label="fornecedores"
          href={`/catalogo?tipo=${tipoSlug.toLowerCase()}&gerenciar=fornecedores`}
          active={gerenciar === "fornecedores"}
        />
        <StatCard
          value={totalLinhas} label="linhas"
          href={`/catalogo?tipo=${tipoSlug.toLowerCase()}&gerenciar=linhas`}
          active={gerenciar === "linhas"}
        />
        <StatCard
          value={totalCategorias} label="categorias"
          href={`/catalogo?tipo=${tipoSlug.toLowerCase()}&gerenciar=categorias`}
          active={gerenciar === "categorias"}
        />
      </div>

      {/* Views de gerenciamento */}
      {gerenciar === "fornecedores" && (
        <GerenciarFornecedores
          fornecedores={fornecedoresGerenciar}
          tiposLinha={tiposLinhaGerenciar}
        />
      )}
      {gerenciar === "linhas" && (
        <GerenciarLinhas
          linhas={linhasComProdutos}
          tipoSlug={tipoSlug.toLowerCase()}
          podeCriar={podeCriar}
        />
      )}
      {gerenciar === "categorias" && (
        <GerenciarCategorias
          linhas={linhasComCategorias}
          podeCriar={podeCriar}
        />
      )}

      {/* Conteúdo normal (produtos) — apenas quando não há view de gerenciamento */}
      {!gerenciar && (
        <>
      {/* FilterBar */}
      <div className="mt-4">
        <FilterBar
          fornecedores={fornecedoresDisponiveis}
          linhas={linhasDisponiveis}
          categorias={categoriasNomes}
          current={currentFilters}
        />
      </div>

      {/* Resumo de resultados */}
      <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
        <span>
          {totalProdutos === 0
            ? "Nenhum produto encontrado"
            : `${totalProdutos} produto${totalProdutos !== 1 ? "s" : ""}${hasFilters ? " encontrados" : ""}`}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </span>
      </div>

      {/* Lista de produtos */}
      {items.length > 0 ? (
        <div className="mt-3 card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="w-[68px] px-3 py-2.5 font-medium" />
                <th className="px-4 py-2.5 font-medium">Código</th>
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Fornecedor</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Linha</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Und.</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line last:border-0 transition-colors hover:bg-canvas"
                >
                  {/* Preview */}
                  <td className="px-3 py-2">
                    <Link href={item.href}>
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.descricao}
                          className="h-[52px] w-[52px] rounded border border-line bg-white object-contain p-0.5"
                        />
                      ) : (
                        <div className="h-[52px] w-[52px] rounded border border-line bg-canvas" />
                      )}
                    </Link>
                  </td>

                  {/* Código */}
                  <td className="px-4 py-3">
                    <Link
                      href={item.href}
                      className="font-mono text-xs font-medium text-steel hover:underline"
                    >
                      {item.codigo}
                    </Link>
                  </td>

                  {/* Descrição */}
                  <td className="px-4 py-3 font-medium">
                    <Link href={item.href} className="hover:text-steel hover:underline">
                      {item.descricao}
                    </Link>
                  </td>

                  {/* Fornecedor — clicável para filtrar */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {item.fornecedor ? (
                      <Link
                        href={buildFilterUrl(baseParams, "fornecedor", item.fornecedor)}
                        className="text-xs text-ink-soft hover:text-steel hover:underline"
                      >
                        {item.fornecedor}
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>

                  {/* Linha — clicável para filtrar */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    {item.linha ? (
                      <Link
                        href={buildFilterUrl(baseParams, "linha", item.linha.id)}
                        className="text-xs text-ink-soft hover:text-steel hover:underline"
                      >
                        {item.linha.nome}
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>

                  {/* Categoria — clicável para filtrar */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {item.categoria ? (
                      <Link
                        href={buildFilterUrl(baseParams, "categoria", item.categoria.nome)}
                        className="text-xs text-ink-soft hover:text-steel hover:underline"
                      >
                        {item.categoria.nome}
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>

                  {/* Unidade */}
                  <td className="px-4 py-3 text-xs text-ink-faint">{item.unidade}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.status ? "bg-green-500" : "bg-slate-400"
                        }`}
                      />
                      {item.status ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 card flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">
            {hasFilters ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            {hasFilters
              ? "Tente ajustar os filtros ou limpar a busca."
              : `${tipoAtual?.nome ?? "Esta categoria"} ainda não possui produtos.`}
          </p>
          {hasFilters ? (
            <Link
              href={`/catalogo?tipo=${tipoSlug.toLowerCase()}`}
              className="btn-secondary mt-5 text-sm"
            >
              Limpar filtros
            </Link>
          ) : podeCriar ? (
            <Link
              href={`/catalogo/nova-linha?tipo=${tipoSlug.toLowerCase()}`}
              className="btn-primary mt-5"
            >
              Nova linha
            </Link>
          ) : null}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {pagina > 1 && (
            <Link
              href={buildPageUrl(baseParams, pagina - 1)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink-soft hover:bg-canvas"
            >
              ← Anterior
            </Link>
          )}
          <span className="px-3 text-sm text-ink-soft">
            {pagina} / {totalPaginas}
          </span>
          {pagina < totalPaginas && (
            <Link
              href={buildPageUrl(baseParams, pagina + 1)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink-soft hover:bg-canvas"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  filtered,
  href,
  active,
}: {
  value: number;
  label: string;
  filtered?: boolean;
  href?: string;
  active?: boolean;
}) {
  const inner = (
    <>
      <p className="text-2xl font-bold tracking-tight text-ink">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        {label}
        {filtered && <span className="ml-1 text-ink-faint">(filtrado)</span>}
      </p>
    </>
  );
  const cls = `rounded-xl border px-4 py-3 transition-colors ${
    active
      ? "border-steel bg-steel/5"
      : "border-line bg-surface hover:border-steel/40 hover:bg-canvas"
  }`;
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}
