import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { criarProduto } from "@/modules/squadframe/actions/catalogo/actions";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { defaultUnidade, TIPO_UNIDADE_OPCOES, specLabels } from "@/modules/squadframe/lib/tipo-unidade";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage({
  params,
}: {
  params: { linhaId: string };
}) {
  const supabase = createClient();

  const [{ data: linha }, { data: categorias }] = await Promise.all([
    supabase
      .from("linhas")
      .select("id, nome, tipo")
      .eq("id", params.linhaId)
      .single(),
    supabase
      .from("categorias_perfil")
      .select("id, nome, tipo")
      .eq("linha_id", params.linhaId)
      .order("tipo, nome"),
  ]);

  if (!linha) notFound();

  // Busca unidade padrão do tipo desta linha
  let tipoUnidade: string | null = null;
  if ((linha as any).tipo) {
    const { data: tipoData, error: tipoErr } = await supabase
      .from("tipos_linha")
      .select("unidade")
      .eq("slug", (linha as any).tipo)
      .maybeSingle();
    if (!tipoErr) tipoUnidade = tipoData?.unidade ?? null;
  }

  const unidadePadrao = defaultUnidade(tipoUnidade);
  const labels = specLabels(tipoUnidade);
  const criarProdutoNaLinha = criarProduto.bind(null, params.linhaId);

  const showSpecs = tipoUnidade && tipoUnidade !== "UN" && tipoUnidade !== "CX";

  return (
    <div className="px-8 py-8">
      <BackButton href={`/squadframe/catalogo/${params.linhaId}`} />

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Novo produto</h1>
      <p className="mt-1 text-sm text-text-2">Linha: {linha.nome}</p>

      <form action={criarProdutoNaLinha} className="card mt-6 max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Código mestre</label>
            <input
              name="codigo_mestre"
              required
              className="field font-mono"
              placeholder="Ex: AL-1234"
            />
            <p className="mt-1 text-xs text-text-3">
              Deve ser único em todo o catálogo
            </p>
          </div>

          <div>
            <label className="label">Unidade</label>
            <select name="unidade" required className="field" defaultValue={unidadePadrao}>
              {TIPO_UNIDADE_OPCOES.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {tipoUnidade && (
              <p className="mt-1 text-xs text-text-3">
                Padrão desta aba: {unidadePadrao}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Nome técnico</label>
            <input
              name="nome_tecnico"
              required
              className="field"
              placeholder="Ex: Perfil T 45mm — Batente superior"
            />
          </div>

          <div>
            <label className="label">
              Categoria{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <select name="categoria_id" className="field">
              <option value="">Sem categoria</option>
              {categorias?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.tipo ? `${cat.tipo} — ${cat.nome}` : cat.nome}
                </option>
              ))}
            </select>
          </div>

          {showSpecs && (
            <>
              <div className="sm:col-span-2">
                <hr className="border-border" />
                <p className="mt-3 text-xs font-medium uppercase tracking-widest text-text-3">
                  Especificações
                </p>
              </div>

              {labels.tamanho && (
                <div>
                  <label className="label">{labels.tamanho}</label>
                  <input
                    name="tamanho_mm"
                    type="number"
                    step="0.01"
                    min="0"
                    className="field"
                    placeholder="Ex: 6000"
                  />
                </div>
              )}

              <div>
                <label className="label">{labels.peso}</label>
                <input
                  name="peso_metro"
                  type="number"
                  step="0.001"
                  min="0"
                  className="field"
                  placeholder="Ex: 1.23"
                />
              </div>

              <div>
                <label className="label">{labels.preco}</label>
                <input
                  name="preco_metro"
                  type="number"
                  step="0.01"
                  min="0"
                  className="field"
                  placeholder="Ex: 12.50"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className="label">
              Descrição{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <textarea name="descricao" rows={3} className="field" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">
              Observações{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <textarea name="observacoes" rows={2} className="field" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit">
            Criar produto
          </Button>
          <Button as="a" href={`/squadframe/catalogo/${params.linhaId}`} variant="ghost">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
