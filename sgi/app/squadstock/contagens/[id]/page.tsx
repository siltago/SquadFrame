import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { caminhoLocal, type LocalNo } from "@/modules/squadstock/lib/caminho-local";
import { ContagemDetalhe, type ItemContagem } from "@/modules/squadstock/components/contagens/contagem-detalhe";

export const dynamic = "force-dynamic";

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function ContagemDetalhePage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);

  const admin = createAdminClient();

  const { data: contagem } = await admin
    .from("stock_contagens")
    .select("id, numero, modo, status, local_raiz_id, foto_comprovante_url, criado_em, concluido_em")
    .eq("id", params.id)
    .maybeSingle();
  if (!contagem) notFound();

  const [{ data: itensRaw }, { data: locais }] = await Promise.all([
    admin
      .from("stock_contagem_itens")
      .select(
        "id, produto_id, local_id, obra_id, cor_id, quantidade_esperada, quantidade_contada, produto:produtos(codigo_mestre, nome, unidade), obra:obras(nome), cor:cores_ral(codigo_ral)"
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

  const itens: ItemContagem[] = (itensRaw ?? []).map((i) => {
    const produto = rel(i.produto);
    const obra = rel(i.obra);
    const cor = rel(i.cor);
    return {
      id: i.id,
      codigo: produto?.codigo_mestre ?? "—",
      nome: produto?.nome ?? "—",
      unidade: produto?.unidade ?? "un",
      fotoUrl: fotoPorProduto.get(i.produto_id) ?? null,
      caminhoLocal: caminhoLocal(porId, i.local_id),
      obraNome: obra?.nome ?? null,
      corLabel: cor?.codigo_ral ?? null,
      quantidadeEsperada: i.quantidade_esperada,
      quantidadeContada: i.quantidade_contada,
    };
  });

  let comprovanteUrl: string | null = null;
  if (contagem.foto_comprovante_url) {
    const { data } = await admin.storage.from("stock-contagens").createSignedUrl(contagem.foto_comprovante_url, 3600);
    comprovanteUrl = data?.signedUrl ?? null;
  }

  // Caminho completo (não só o nome bruto do nó raiz) — a árvore permite
  // nós com o mesmo nome em ramos diferentes, então "Prateleira 3" sozinho
  // não identifica o local de verdade.
  const localRaizNome = caminhoLocal(porId, contagem.local_raiz_id) || "—";

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <Link href="/squadstock/contagens" className="text-xs text-text-3 hover:text-text">
        ← Contagens
      </Link>

      <ContagemDetalhe
        contagemId={contagem.id}
        numero={contagem.numero}
        modo={contagem.modo}
        status={contagem.status}
        localRaizNome={localRaizNome}
        criadoEm={contagem.criado_em}
        concluidoEm={contagem.concluido_em}
        comprovanteUrl={comprovanteUrl}
        itens={itens}
        podeGerenciar={!!podeGerenciar}
      />
    </div>
  );
}
