import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { NovaCategoriaInline } from "@/modules/squadframe/components/catalogo/nova-categoria-inline";
import { ApagarLinhaBtn } from "@/modules/squadframe/components/catalogo/apagar-linha-btn";
import { ImportarXml } from "@/modules/squadframe/components/catalogo/importar-xml";
import { BtnAlterarUnidade } from "@/modules/squadframe/components/catalogo/btn-alterar-unidade";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function LinhaPage({
  params,
  searchParams,
}: {
  params: { linhaId: string };
  searchParams: { tipo?: string };
}) {
  const supabase = createClient();
  const tipoAtivo = searchParams.tipo?.toUpperCase() ?? null;

  const [{ data: linha }, { data: categorias }, { data: produtos }] =
    await Promise.all([
      supabase
        .from("linhas")
        .select("id, nome, fabricante, descricao")
        .eq("id", params.linhaId)
        .single(),
      supabase
        .from("categorias_perfil")
        .select("id, nome, tipo")
        .eq("linha_id", params.linhaId)
        .order("nome"),
      supabase
        .from("produtos")
        .select("id, codigo_mestre, nome, unidade, status, categoria_id, produto_arquivos(id, url_preview, is_principal)")
        .eq("linha_id", params.linhaId)
        .order("nome"),
    ]);

  if (!linha) notFound();

  const cats = categorias ?? [];
  const prods = produtos ?? [];

  // Unique tipos present in this line, sorted
  const todosTipos = Array.from(new Set(cats.map((c) => c.tipo ?? "OUTROS"))).sort();

  // Categories to render (filtered by active tipo if any)
  const catsFiltradas = tipoAtivo
    ? cats.filter((c) => (c.tipo ?? "OUTROS") === tipoAtivo)
    : cats;

  // Groups: tipo → categories → products
  const tiposVisiveis = tipoAtivo ? [tipoAtivo] : todosTipos;
  const grupos = tiposVisiveis
    .map((tipo) => ({
      tipo,
      categorias: catsFiltradas
        .filter((c) => (c.tipo ?? "OUTROS") === tipo)
        .map((cat) => ({
          ...cat,
          produtos: prods.filter((p) => p.categoria_id === cat.id),
        })),
    }))
    .filter((g) => g.categorias.length > 0);

  // Orphaned products (no valid category) — only shown in "Todos" view
  const allCatIds = new Set(cats.map((c) => c.id));
  const semCategoria = !tipoAtivo
    ? prods.filter((p) => !p.categoria_id || !allCatIds.has(p.categoria_id))
    : [];

  const vazio = grupos.length === 0 && semCategoria.length === 0;

  return (
    <div className="px-8 py-8">
      <BackButton href="/squadframe/catalogo" />

      {/* Cabeçalho */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-3">
            Linha
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {linha.nome}
          </h1>
          {linha.fabricante && (
            <p className="mt-0.5 text-sm text-text-2">{linha.fabricante}</p>
          )}
          {linha.descricao && (
            <p className="mt-2 max-w-prose text-sm text-text-2">
              {linha.descricao}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ApagarLinhaBtn linhaId={params.linhaId} nomeLinha={linha.nome} />
          <BtnAlterarUnidade linhaId={params.linhaId} />
          <ImportarXml linhaId={params.linhaId} />
          <Button as="a" href={`/squadframe/catalogo/${params.linhaId}/novo-produto`}>
            Novo produto
          </Button>
        </div>
      </div>

      {/* Tabs de tipo */}
      {todosTipos.length > 0 && (
        <div className="mt-6 flex overflow-x-auto border-b border-border">
          <Link
            href={`/squadframe/catalogo/${params.linhaId}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
              !tipoAtivo
                ? "border-primary text-primary"
                : "border-transparent text-text-2 hover:text-text"
            }`}
          >
            Todos
          </Link>
          {todosTipos.map((tipo) => (
            <Link
              key={tipo}
              href={`/squadframe/catalogo/${params.linhaId}?tipo=${encodeURIComponent(tipo)}`}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
                tipoAtivo === tipo
                  ? "border-primary text-primary"
                  : "border-transparent text-text-2 hover:text-text"
              }`}
            >
              {tipo}
            </Link>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      <div className="mt-8 space-y-10">
        {grupos.map((grupo) => (
          <div key={grupo.tipo}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text">
              {grupo.tipo}
            </h2>
            <div className="space-y-6">
              {grupo.categorias.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">
                    {cat.nome}
                  </h3>
                  <TabelaProdutos
                    produtos={cat.produtos}
                    linhaId={params.linhaId}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Produtos sem categoria — apenas na view "Todos" */}
        {semCategoria.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">
              SEM CATEGORIA
            </h2>
            <TabelaProdutos
              produtos={semCategoria}
              linhaId={params.linhaId}
            />
          </div>
        )}

        {/* Estado vazio */}
        {vazio && (
          <div className="card p-10 text-center">
            <p className="font-display text-base font-semibold text-text">
              Nenhum produto cadastrado
            </p>
            <p className="mt-1 text-sm text-text-2">
              {tipoAtivo
                ? `Nenhum produto do tipo ${tipoAtivo} nesta linha.`
                : "Esta linha ainda não possui produtos."}
            </p>
            {!tipoAtivo && (
              <Button as="a" href={`/squadframe/catalogo/${params.linhaId}/novo-produto`} className="mt-4 inline-flex">
                Adicionar primeiro produto
              </Button>
            )}
          </div>
        )}

        {/* Nova categoria inline */}
        <div>
          <NovaCategoriaInline linhaId={params.linhaId} />
        </div>
      </div>
    </div>
  );
}

function TabelaProdutos({
  produtos,
  linhaId,
}: {
  produtos: Array<{
    id: string;
    codigo_mestre: string;
    nome: string;
    unidade: string;
    status: boolean;
    produto_arquivos?: { id: string; url_preview: string | null; is_principal: boolean }[];
  }>;
  linhaId: string;
}) {
  if (produtos.length === 0) {
    return (
      <p className="text-xs italic text-text-3">
        Nenhum produto nesta categoria.
      </p>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
            <th className="w-[76px] px-3 py-2.5 font-medium" />
            <th className="px-4 py-2.5 font-medium">Código mestre</th>
            <th className="px-4 py-2.5 font-medium">Nome técnico</th>
            <th className="px-4 py-2.5 font-medium">Unidade</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => {
            const arquivos = p.produto_arquivos ?? [];
            const preview =
              arquivos.find((a) => a.is_principal && a.url_preview)?.url_preview ??
              arquivos.find((a) => a.url_preview)?.url_preview ??
              null;

            return (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-bg"
              >
                <td className="px-3 py-2">
                  <Link href={`/squadframe/catalogo/${linhaId}/${p.id}`}>
                    {preview ? (
                      <img
                        src={preview}
                        alt={p.nome}
                        className="h-[60px] w-[60px] rounded border border-border bg-white object-contain p-0.5"
                      />
                    ) : (
                      <div className="h-[60px] w-[60px] rounded border border-border bg-bg" />
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/squadframe/catalogo/${linhaId}/${p.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {p.codigo_mestre}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-medium">{p.nome}</td>
                <td className="px-4 py-2.5 text-text-2">{p.unidade}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status
                        ? "bg-success-soft text-success"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.status ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
