import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { Button } from "@/ui/components/Button";
import { FilterBar } from "@/ui/components/FilterBar";
import { StockIcon, LayersIcon, MapPinIcon, CheckCircleIcon, WarehouseIcon, CheckSquareIcon, AlertTriangleIcon, PlusIcon } from "@/ui/icons";
import { StatCard } from "@/ui/components/Card";
import { cn } from "@/ui/lib/cn";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { buildSearchPattern } from "@/ui/lib/search";
import { buscarLocaisComCaminho } from "@/modules/squadstock/lib/locais-com-caminho";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

interface ProdutoRow {
  id: string;
  codigo_mestre: string;
  nome: string;
  unidade: string | null;
  linha: { nome: string } | { nome: string }[] | null;
}

interface LinhaAgregada {
  produtoId: string;
  codigo: string;
  nome: string;
  linha: string;
  unidade: string;
  quantidade: number;
  localNome: string | null; // preenchido só quando há filtro de local ativo
  qtdLocais: number;
  atualizadoEm: string | null;
  coresComSaldo: { codigoRal: string; quantidade: number }[]; // só != [] quando o produto tem saldo em mais de uma cor
}

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: { local_id?: string; q?: string; pagina?: string; tipo?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const temPermissao = (chave: string) =>
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(chave);
  const podeGerenciar = temPermissao(STOCK_PERMISSIONS.MOVIMENTACAO_GERENCIAR);
  const podeGerenciarMapa = temPermissao(STOCK_PERMISSIONS.MAPA_GERENCIAR);
  const podeGerenciarContagem = temPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);

  const admin = createAdminClient();
  const localId = searchParams.local_id?.trim() ?? "";
  const filtroQ = searchParams.q?.trim() ?? "";
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1") || 1);

  const [
    locaisAtivos,
    { data: tiposList },
    { data: locaisFisicos },
    { count: totalContagens },
    { count: contagensEmAndamento },
  ] = await Promise.all([
    buscarLocaisComCaminho(admin),
    admin.from("tipos_linha").select("id, nome, slug").order("ordem"),
    // Base do overview do mapa e da detecção de "sem mapa" — mesmo filtro
    // que /squadstock/locais (fora "Não alocado", que é especial).
    admin.from("stock_locais").select("id, parent_id").eq("ativo", true).eq("especial", false),
    admin.from("stock_contagens").select("id", { count: "exact", head: true }),
    admin.from("stock_contagens").select("id", { count: "exact", head: true }).in("status", ["ABERTA", "EM_CONTAGEM"]),
  ]);

  // ── Overview do mapa físico ──────────────────────────────────────────
  const locaisMapa = locaisFisicos ?? [];
  const mapaVazio = locaisMapa.length === 0;
  const totalLocais = locaisMapa.length;
  const totalGalpoes = locaisMapa.filter((l) => !l.parent_id).length;
  const porIdLocal = new Map(locaisMapa.map((l) => [l.id, l]));
  const profundidadeDe = (id: string) => {
    let d = 1;
    let atual = porIdLocal.get(id);
    while (atual?.parent_id && porIdLocal.has(atual.parent_id)) {
      d++;
      atual = porIdLocal.get(atual.parent_id);
    }
    return d;
  };
  const totalNiveis = locaisMapa.reduce((max, l) => Math.max(max, profundidadeDe(l.id)), 0);

  const tipoParam = searchParams.tipo?.trim() ?? "";
  const tipoSlug = (tiposList ?? []).some((t) => t.slug === tipoParam) ? tipoParam : "";

  // Mesma separação por tipo do catálogo (Perfis, Componentes, etc.) —
  // produto herda o tipo da linha dele. Poucas dezenas de linhas por tipo
  // (não milhares), então resolver os linha_ids primeiro e filtrar com
  // .in() é seguro aqui — diferente de resolver PRODUTO_ids (que pode
  // passar de mil e estourar o tamanho da URL do PostgREST).
  let linhaIdsDoTipo: string[] | null = null;
  if (tipoSlug) {
    const { data: linhasDoTipo } = await admin.from("linhas").select("id").eq("tipo", tipoSlug);
    linhaIdsDoTipo = (linhasDoTipo ?? []).map((l) => l.id);
  }

  // A tela parte do CATÁLOGO (produtos), não do que já foi movimentado —
  // senão um produto que nunca teve entrada lançada simplesmente some da
  // lista, mesmo existindo e precisando ser estocado.
  let produtosQuery = admin
    .from("produtos")
    .select("id, codigo_mestre, nome, unidade, linha:linhas(nome)", { count: "exact" })
    .eq("status", true)
    .is("deleted_at", null)
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (tipoSlug) {
    produtosQuery = linhaIdsDoTipo && linhaIdsDoTipo.length > 0
      ? produtosQuery.in("linha_id", linhaIdsDoTipo)
      : produtosQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }
  if (filtroQ) {
    const qPattern = buildSearchPattern(filtroQ);
    produtosQuery = produtosQuery.or(`codigo_mestre.ilike.${qPattern},nome.ilike.${qPattern}`);
  }

  const { data: produtosPage, count: totalProdutosFiltrados } = await produtosQuery;
  const produtos = (produtosPage ?? []) as unknown as ProdutoRow[];
  const produtoIdsPagina = produtos.map((p) => p.id);

  // Só busca saldo pros ≤50 produtos da página atual — .in() com uma lista
  // curta é seguro (o bug do tipo era resolver milhares de IDs de uma vez).
  let saldosPagina: { produto_id: string; local_id: string; cor_id: string | null; quantidade: number; atualizado_em: string; cor: { codigo_ral: string } | { codigo_ral: string }[] | null }[] = [];
  if (produtoIdsPagina.length > 0) {
    let saldosQuery = admin
      .from("stock_saldos")
      .select("produto_id, local_id, cor_id, quantidade, atualizado_em, cor:cores_ral(codigo_ral)")
      .in("produto_id", produtoIdsPagina)
      .gt("quantidade", 0);
    if (localId) saldosQuery = saldosQuery.eq("local_id", localId);
    const { data } = await saldosQuery;
    saldosPagina = data ?? [];
  }
  // Caminho completo (não só o nome bruto — ambíguo desde que a árvore
  // permite nós com o mesmo nome em ramos diferentes) do local filtrado.
  const caminhoLocalFiltrado = localId ? locaisAtivos.find((l) => l.id === localId)?.caminho ?? null : null;

  const linhasPagina: LinhaAgregada[] = produtos.map((p) => {
    const l = rel(p.linha);
    const saldosDoProduto = saldosPagina.filter((s) => s.produto_id === p.id);
    const quantidade = saldosDoProduto.reduce((sum, s) => sum + s.quantidade, 0);
    const locaisDistintos = new Set(saldosDoProduto.map((s) => s.local_id));
    const atualizadoEm = saldosDoProduto.reduce<string | null>((max, s) => (!max || s.atualizado_em > max ? s.atualizado_em : max), null);

    // Quebra por cor — só mostrada quando o produto tem saldo em mais de uma
    // (a maioria do catálogo nunca tem cor, cor_id fica sempre NULL e essa
    // lista vira só ["Natural"], que não vale a pena exibir sozinha).
    const porCor = new Map<string, number>();
    for (const s of saldosDoProduto) {
      const cor = rel(s.cor);
      const label = cor?.codigo_ral ?? "Natural";
      porCor.set(label, (porCor.get(label) ?? 0) + s.quantidade);
    }
    const coresComSaldo = porCor.size > 1
      ? [...porCor.entries()].map(([codigoRal, qtd]) => ({ codigoRal, quantidade: qtd }))
      : [];

    return {
      produtoId: p.id,
      codigo: p.codigo_mestre,
      nome: p.nome,
      linha: l?.nome ?? "—",
      unidade: p.unidade ?? "un",
      quantidade,
      localNome: localId ? caminhoLocalFiltrado : null,
      qtdLocais: locaisDistintos.size,
      atualizadoEm,
      coresComSaldo,
    };
  });

  const totalProdutos = totalProdutosFiltrados ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalProdutos / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);

  // KPIs de "quanto realmente tem estoque" — consulta separada (não
  // paginada) usando join com !inner como filtro, em vez de materializar
  // lista de IDs (mesmo padrão seguro usado no filtro por tipo da query
  // principal de saldos, já testado).
  const kpiLinhaEmbed = tipoSlug ? "linha:linhas!inner(tipo)" : "linha:linhas(tipo)";
  let kpiQuery = admin
    .from("stock_saldos")
    .select(`produto_id, local_id, produto:produtos!inner(codigo_mestre, nome, ${kpiLinhaEmbed})`)
    .gt("quantidade", 0)
    .limit(5000);
  if (localId) kpiQuery = kpiQuery.eq("local_id", localId);
  if (tipoSlug) kpiQuery = kpiQuery.eq("produto.linha.tipo", tipoSlug);
  if (filtroQ) {
    const qPattern = buildSearchPattern(filtroQ);
    kpiQuery = kpiQuery.or(`codigo_mestre.ilike.${qPattern},nome.ilike.${qPattern}`, { foreignTable: "produto" });
  }
  const { data: kpiSaldos } = await kpiQuery;
  const produtosComSaldo = new Set((kpiSaldos ?? []).map((s) => s.produto_id)).size;
  const locaisComEstoque = new Set((kpiSaldos ?? []).map((s) => s.local_id)).size;

  const buildUrl = (params: Record<string, string>) => {
    const usp = new URLSearchParams();
    if (params.tipo) usp.set("tipo", params.tipo);
    if (params.local_id) usp.set("local_id", params.local_id);
    if (params.q) usp.set("q", params.q);
    if (params.pagina && params.pagina !== "1") usp.set("pagina", params.pagina);
    const qs = usp.toString();
    return `/squadstock${qs ? `?${qs}` : ""}`;
  };

  // Filtro de tipo (antes um rail lateral) — agora pills acima da tabela,
  // preservando local/busca e voltando pra página 1.
  const tipoHref = (slug: string) => buildUrl({ tipo: slug, local_id: localId, q: filtroQ, pagina: "1" });
  const pills: { slug: string; nome: string }[] = [{ slug: "", nome: "Todos" }, ...(tiposList ?? []).map((t) => ({ slug: t.slug, nome: t.nome }))];

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
          <StockIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-text-3">Gestão do estoque físico e saldo de todo produto do catálogo.</p>
        </div>
      </div>

      {/* ── Gerenciamento de estoque físico ──────────────────────────── */}
      <section className="mt-6 card divide-y divide-border">
        <div className="px-5 py-3">
          <h2 className="text-sm font-semibold text-text">Gerenciamento de estoque físico</h2>
          <p className="text-xs text-text-3">Estrutura de locais e conferências físicas.</p>
        </div>

        {/* Mapa de estoque */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <WarehouseIcon size={16} className="text-text-3" />
            <h3 className="text-sm font-semibold text-text">Mapa de estoque</h3>
          </div>

          {mapaVazio ? (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium text-text">Crie o mapa do estoque</p>
                  <p className="text-xs text-text-3">Monte a estrutura física (galpão, corredor, prateleira…) pra localizar cada produto.</p>
                </div>
              </div>
              {podeGerenciarMapa && (
                <Link href="/squadstock/locais" className="shrink-0">
                  <Button size="sm">
                    <PlusIcon size={16} />
                    Criar mapa
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Galpões" value={totalGalpoes} icon={<WarehouseIcon size={18} />} />
                <StatCard label="Locais" value={totalLocais} icon={<MapPinIcon size={18} />} />
                <StatCard label="Níveis" value={totalNiveis} icon={<LayersIcon size={18} />} />
                <StatCard label="Locais com estoque" value={locaisComEstoque} icon={<CheckCircleIcon size={18} />} />
              </div>
              <Link href="/squadstock/locais">
                <Button variant="secondary" size="sm">Abrir mapa completo</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Contagens */}
        <div className="px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquareIcon size={16} className="text-text-3" />
                <h3 className="text-sm font-semibold text-text">Contagens</h3>
              </div>
              <p className="mt-1 text-xs text-text-3">
                {(totalContagens ?? 0)} contagem{(totalContagens ?? 0) !== 1 ? "s" : ""}
                {" · "}
                {(contagensEmAndamento ?? 0)} em andamento
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {podeGerenciarContagem && (
                <Link href="/squadstock/contagens/nova">
                  <Button size="sm">
                    <PlusIcon size={16} />
                    Nova contagem
                  </Button>
                </Link>
              )}
              <Link href="/squadstock/contagens">
                <Button variant="secondary" size="sm">Ver todas</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Saldo atual ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Saldo atual</h2>
            <p className="text-sm text-text-3">Todo produto do catálogo, com o saldo somado entre todos os locais — inclusive o que ainda não tem nenhuma entrada lançada.</p>
          </div>
          {podeGerenciar && (
            <Link href="/squadstock/movimentacoes/nova" className="shrink-0">
              <Button>Nova movimentação</Button>
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Produtos no catálogo" value={totalProdutos} icon={<LayersIcon size={18} />} />
          <StatCard label="Com saldo" value={produtosComSaldo} sub={`de ${totalProdutos}`} tone={produtosComSaldo < totalProdutos ? "warning" : undefined} icon={<CheckCircleIcon size={18} />} />
          <StatCard label="Locais com estoque" value={locaisComEstoque} icon={<MapPinIcon size={18} />} />
        </div>

        {/* Pills de tipo (ex-menu lateral) */}
        <div className="mt-5 -mx-8 overflow-x-auto px-8">
          <div className="flex w-max gap-1.5">
            {pills.map((p) => {
              const ativo = tipoSlug === p.slug;
              return (
                <Link
                  key={p.slug || "todos"}
                  href={tipoHref(p.slug)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                    ativo
                      ? "bg-gradient-to-br from-accent to-accent-hover text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
                      : "bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text"
                  )}
                >
                  {p.nome}
                </Link>
              );
            })}
          </div>
        </div>

        <FilterBar method="GET" className="mt-4">
          {tipoSlug && <input type="hidden" name="tipo" value={tipoSlug} />}
          <div className="flex-1 max-w-xs">
            <label className="label">Local</label>
            <select name="local_id" defaultValue={localId} className="field h-9 text-sm w-full">
              <option value="">Todos os locais (total)</option>
              {locaisAtivos.map((l) => (
                <option key={l.id} value={l.id}>{l.caminho}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 max-w-sm">
            <label className="label">Buscar produto</label>
            <input
              name="q"
              defaultValue={filtroQ}
              placeholder="Código ou nome…"
              className="field h-9 text-sm w-full"
            />
          </div>
          <Button type="submit" variant="accent" size="sm">Filtrar</Button>
          {(localId || filtroQ || tipoSlug) && (
            <Link href="/squadstock" className="text-xs text-text-3 hover:text-text underline pb-2">
              Limpar filtros
            </Link>
          )}
        </FilterBar>

        <div className="mt-4 card overflow-x-auto">
          <div className="border-b border-border px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              {localId ? "Saldo no local" : "Saldo total"}
            </h3>
            <span className="text-xs text-text-3">{totalProdutos} produto{totalProdutos !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-5 py-2 font-medium">Código</th>
                <th className="px-5 py-2 font-medium">Produto</th>
                <th className="px-5 py-2 font-medium">Linha</th>
                {localId ? (
                  <th className="px-5 py-2 font-medium">Local</th>
                ) : (
                  <th className="px-5 py-2 font-medium">Locais</th>
                )}
                <th className="px-5 py-2 font-medium text-right">Quantidade</th>
                <th className="px-5 py-2 font-medium">Atualizado</th>
                {podeGerenciar && <th className="px-5 py-2 font-medium text-right">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.length === 0 ? (
                <tr>
                  <td colSpan={podeGerenciar ? 7 : 6} className="px-5 py-10 text-center text-sm text-text-3">
                    Nenhum produto encontrado com esses filtros.
                  </td>
                </tr>
              ) : linhasPagina.map((l) => {
                const semSaldo = l.quantidade === 0;
                return (
                  <tr key={l.produtoId} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-5 py-2.5 font-mono text-xs text-text-3">{l.codigo}</td>
                    <td className={`px-5 py-2.5 font-medium ${semSaldo ? "text-text-2" : ""}`}>{l.nome}</td>
                    <td className="px-5 py-2.5 text-text-2">{l.linha}</td>
                    {localId ? (
                      <td className="px-5 py-2.5 text-text-2">{l.localNome ?? <span className="text-text-3">—</span>}</td>
                    ) : (
                      <td className="px-5 py-2.5">
                        {l.qtdLocais > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-2">
                            {l.qtdLocais} local{l.qtdLocais !== 1 ? "is" : ""}
                          </span>
                        ) : (
                          <span className="text-text-3">—</span>
                        )}
                      </td>
                    )}
                    <td className={`px-5 py-2.5 text-right tabular-nums ${semSaldo ? "text-text-3" : "font-semibold"}`}>
                      {l.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} <span className="font-normal text-text-3">{l.unidade}</span>
                      {l.coresComSaldo.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                          {l.coresComSaldo.map((c) => (
                            <span key={c.codigoRal} className="inline-flex items-center rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-normal text-text-2">
                              {c.codigoRal}: {c.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-text-3 text-xs">{l.atualizadoEm ? new Date(l.atualizadoEm).toLocaleDateString("pt-BR") : "—"}</td>
                    {podeGerenciar && (
                      <td className="px-5 py-2.5 text-right">
                        <Link
                          href={`/squadstock/movimentacoes/nova?produto_id=${l.produtoId}${localId ? `&local_id=${localId}` : ""}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Registrar
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-text-3">
              <span>Página {paginaAtual} de {totalPaginas}</span>
              <div className="flex gap-2">
                {paginaAtual > 1 && (
                  <Link href={buildUrl({ tipo: tipoSlug, local_id: localId, q: filtroQ, pagina: String(paginaAtual - 1) })} className="hover:text-text underline">
                    Anterior
                  </Link>
                )}
                {paginaAtual < totalPaginas && (
                  <Link href={buildUrl({ tipo: tipoSlug, local_id: localId, q: filtroQ, pagina: String(paginaAtual + 1) })} className="hover:text-text underline">
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
