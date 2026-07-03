import Link from "next/link";
import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { criarLinha } from "@/modules/squadframe/actions/catalogo/actions";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function NovaLinhaPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const supabase = createClient();
  const { data: tipos } = await supabase
    .from("tipos_linha")
    .select("nome, slug")
    .order("ordem");

  const tiposList = tipos ?? [];
  // Busca case-insensitive para tolerar variação de caixa na URL
  const slugParam = (searchParams.tipo ?? "").trim().toUpperCase();
  const tipoPreSelecionado = tiposList.find((t) => t.slug.toUpperCase() === slugParam)?.slug ?? "";

  return (
    <div className="px-8 py-8">
      <BackButton href="/squadframe/catalogo" />

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Nova linha</h1>
      <p className="mt-1 text-sm text-text-2">
        Linhas agrupam produtos de uma mesma série ou fabricante.
      </p>

      <form action={criarLinha} className="card mt-6 max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Tipo / Aba <span className="text-danger">*</span></label>
            <select name="tipo" required defaultValue={tipoPreSelecionado} className="field">
              {tiposList.length === 0 ? (
                <option value="">Crie uma aba no catálogo primeiro</option>
              ) : (
                <>
                  {!tipoPreSelecionado && <option value="">— Selecione a aba —</option>}
                  {tiposList.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.nome}</option>
                  ))}
                </>
              )}
            </select>
            <p className="mt-1 text-xs text-text-3">Em qual aba do catálogo esta linha aparece?</p>
          </div>

          <div>
            <label className="label">
              Fabricante{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <input name="fabricante" className="field" placeholder="Ex: Alumínio São Paulo" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Nome da linha <span className="text-danger">*</span></label>
            <input
              name="nome"
              required
              className="field"
              placeholder="Ex: Série Premium 45"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">
              Descrição{" "}
              <span className="font-normal text-text-2">(opcional)</span>
            </label>
            <textarea
              name="descricao"
              rows={3}
              className="field"
              placeholder="Informações gerais sobre a linha"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit">
            Criar linha
          </Button>
          <Button as="a" href={tipoPreSelecionado ? `/squadframe/catalogo?aba=${tipoPreSelecionado}` : "/squadframe/catalogo"} variant="ghost">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
