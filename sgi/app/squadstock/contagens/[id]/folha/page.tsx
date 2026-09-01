import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { caminhoLocal, type LocalNo } from "@/modules/squadstock/lib/caminho-local";
import { FolhaContagemDocumento, type ItemFolha } from "@/modules/squadstock/components/contagens/folha-contagem-documento";

export const dynamic = "force-dynamic";

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function FolhaContagemPage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();

  const { data: contagem } = await admin
    .from("stock_contagens")
    .select("id, numero, criado_em, local_raiz_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!contagem) notFound();

  const [{ data: itensRaw }, { data: locais }] = await Promise.all([
    admin
      .from("stock_contagem_itens")
      .select(
        "id, produto_id, local_id, obra_id, cor_id, quantidade_esperada, produto:produtos(codigo_mestre, nome, unidade), obra:obras(nome), cor:cores_ral(codigo_ral)"
      )
      .eq("contagem_id", params.id)
      .order("local_id"),
    admin.from("stock_locais").select("id, nome, parent_id"),
  ]);

  const produtoIds = [...new Set((itensRaw ?? []).map((i) => i.produto_id))];
  const { data: fotos } =
    produtoIds.length > 0
      ? await admin.from("produto_arquivos").select("produto_id, url_preview, is_principal").in("produto_id", produtoIds)
      : { data: [] as { produto_id: string; url_preview: string | null; is_principal: boolean }[] };
  const fotoPorProduto = new Map<string, string>();
  for (const f of fotos ?? []) {
    if (!f.url_preview) continue;
    if (f.is_principal || !fotoPorProduto.has(f.produto_id)) fotoPorProduto.set(f.produto_id, f.url_preview);
  }

  const porId = new Map<string, LocalNo>((locais ?? []).map((l) => [l.id, l]));

  const itens: ItemFolha[] = (itensRaw ?? []).map((i) => {
    const produto = rel(i.produto);
    const obra = rel(i.obra);
    const cor = rel(i.cor);
    return {
      codigo: produto?.codigo_mestre ?? "—",
      nome: produto?.nome ?? "—",
      unidade: produto?.unidade ?? "un",
      fotoUrl: fotoPorProduto.get(i.produto_id) ?? null,
      caminhoLocal: caminhoLocal(porId, i.local_id),
      obraNome: obra?.nome ?? null,
      corLabel: cor?.codigo_ral ?? null,
      quantidadeEsperada: i.quantidade_esperada,
    };
  });

  const localRaizNome = caminhoLocal(porId, contagem.local_raiz_id) || "—";

  return (
    <FolhaContagemDocumento
      numero={contagem.numero}
      localRaizNome={localRaizNome}
      criadoEm={contagem.criado_em}
      itens={itens}
      voltarHref={`/squadstock/contagens/${contagem.id}`}
    />
  );
}
