"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { inserirAjuste } from "@/modules/squadstock/actions/movimentacoes";

type Admin = ReturnType<typeof createAdminClient>;

// Sobe a árvore de stock_locais a partir de local_raiz_id e devolve os
// nós-folha da subárvore — é onde o saldo de fato mora (mesma regra de
// desativarNo em mapa.ts: só folha tem saldo direto). Feito em JS (não CTE
// recursiva) porque a árvore inteira já cabe numa única query, mesmo
// espírito de montarArvore em mapa-arvore.tsx.
async function coletarFolhasDescendentes(admin: Admin, raizId: string): Promise<string[]> {
  const { data: locais } = await admin
    .from("stock_locais")
    .select("id, parent_id")
    .eq("ativo", true)
    .eq("especial", false);

  const porPai = new Map<string, string[]>();
  (locais ?? []).forEach((l) => {
    if (l.parent_id) {
      const arr = porPai.get(l.parent_id) ?? [];
      arr.push(l.id);
      porPai.set(l.parent_id, arr);
    }
  });

  const folhas: string[] = [];
  function caminhar(id: string) {
    const filhos = porPai.get(id);
    if (!filhos || filhos.length === 0) folhas.push(id);
    else filhos.forEach(caminhar);
  }
  caminhar(raizId);
  return folhas;
}

// Resolve o filtro de produto/linha/tipo pra uma lista de produto_id, ou
// null se nenhum filtro foi informado (sem restrição). filtro_tipo casa
// contra linhas.tipo (slug de tipos_linha — PERFIL/COMPONENTE/etc, mesmo
// campo usado no catálogo).
async function resolverProdutoIds(
  admin: Admin,
  filtroTipo: string | null,
  filtroLinhaId: string | null,
  filtroProdutoId: string | null
): Promise<string[] | null> {
  if (filtroProdutoId) return [filtroProdutoId];

  if (filtroLinhaId) {
    const { data } = await admin.from("produtos").select("id").eq("linha_id", filtroLinhaId).eq("status", true);
    return (data ?? []).map((p) => p.id);
  }

  if (filtroTipo) {
    const { data: linhas } = await admin.from("linhas").select("id").eq("tipo", filtroTipo);
    const linhaIds = (linhas ?? []).map((l) => l.id);
    if (linhaIds.length === 0) return [];
    const { data: produtos } = await admin.from("produtos").select("id").in("linha_id", linhaIds).eq("status", true);
    return (produtos ?? []).map((p) => p.id);
  }

  return null;
}

// Cria a sessão de contagem: snapshota stock_saldos > 0 das folhas
// descendentes do nó escolhido (filtrado por tipo/linha/produto, se
// informado) pra stock_contagem_itens.quantidade_esperada. A partir daqui
// a sessão é autocontida — mesmo que o saldo real mude durante a
// contagem, o diff em concluirContagem compara contra o que foi
// snapshotado aqui (é exatamente o que se está conferindo).
export async function criarContagem(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const localRaizId = String(formData.get("local_raiz_id") ?? "").trim();
  const filtroTipo = String(formData.get("filtro_tipo") ?? "").trim() || null;
  const filtroLinhaId = String(formData.get("filtro_linha_id") ?? "").trim() || null;
  const filtroProdutoId = String(formData.get("filtro_produto_id") ?? "").trim() || null;
  const modo = String(formData.get("modo") ?? "SISTEMA");

  if (!localRaizId) throw new Error("Selecione um local.");
  if (modo !== "PAPEL" && modo !== "SISTEMA") throw new Error("Modo inválido.");

  const folhas = await coletarFolhasDescendentes(admin, localRaizId);
  if (folhas.length === 0) throw new Error("Esse local não tem sub-níveis mapeados.");

  const produtoIds = await resolverProdutoIds(admin, filtroTipo, filtroLinhaId, filtroProdutoId);
  if (produtoIds && produtoIds.length === 0) throw new Error("Nenhum produto encontrado com esse filtro.");

  let q = admin
    .from("stock_saldos")
    .select("produto_id, local_id, obra_id, cor_id, quantidade")
    .in("local_id", folhas)
    .gt("quantidade", 0);
  if (produtoIds) q = q.in("produto_id", produtoIds);
  const { data: saldos, error: erroSaldos } = await q;
  if (erroSaldos) throw new Error(erroSaldos.message);
  if (!saldos || saldos.length === 0) throw new Error("Nenhum saldo encontrado nesse escopo — nada pra contar.");

  const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_contagem_estoque");
  if (erroNumero) throw new Error(erroNumero.message);

  const { data: contagem, error: erroContagem } = await admin
    .from("stock_contagens")
    .insert({
      numero,
      local_raiz_id: localRaizId,
      filtro_tipo: filtroTipo,
      filtro_linha_id: filtroLinhaId,
      filtro_produto_id: filtroProdutoId,
      modo,
      status: "ABERTA",
      criado_por: usuarioId,
    })
    .select("id")
    .single();
  if (erroContagem) throw new Error(erroContagem.message);

  const itens = saldos.map((s) => ({
    contagem_id: contagem.id,
    produto_id: s.produto_id,
    local_id: s.local_id,
    obra_id: s.obra_id,
    cor_id: s.cor_id,
    quantidade_esperada: s.quantidade,
  }));
  const { error: erroItens } = await admin.from("stock_contagem_itens").insert(itens);
  if (erroItens) throw new Error(erroItens.message);

  revalidatePath("/squadstock/contagens");
  redirect(`/squadstock/contagens/${contagem.id}`);
}

// Modo SISTEMA — grava a contagem de um item direto na tela. Também move a
// sessão pra EM_CONTAGEM na primeira digitação (só informativo).
export async function registrarContagemItem(itemId: string, quantidadeContada: number) {
  await verificarPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  if (!(quantidadeContada >= 0)) throw new Error("Quantidade contada não pode ser negativa.");

  const { data: item, error: erroItem } = await admin
    .from("stock_contagem_itens")
    .select("contagem_id")
    .eq("id", itemId)
    .single();
  if (erroItem || !item) throw new Error("Item de contagem não encontrado.");

  const { error } = await admin
    .from("stock_contagem_itens")
    .update({ quantidade_contada: quantidadeContada, contado_em: new Date().toISOString(), contado_por: usuarioId })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  await admin.from("stock_contagens").update({ status: "EM_CONTAGEM" }).eq("id", item.contagem_id).eq("status", "ABERTA");

  revalidatePath(`/squadstock/contagens/${item.contagem_id}`);
}

// Fecha a sessão: pra cada item com quantidade_contada preenchida e
// diferente da esperada, lança um AJUSTE (mesmo insert de registrarAjuste,
// via helper compartilhado) rastreado até essa contagem. Itens sem
// contagem preenchida são ignorados — ficam de fora do fechamento, não
// geram ajuste (contagem parcial não mexe no que não foi conferido).
export async function concluirContagem(contagemId: string) {
  await verificarPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const { data: itens, error: erroItens } = await admin
    .from("stock_contagem_itens")
    .select("id, produto_id, local_id, obra_id, cor_id, quantidade_esperada, quantidade_contada")
    .eq("contagem_id", contagemId)
    .not("quantidade_contada", "is", null);
  if (erroItens) throw new Error(erroItens.message);
  if (!itens || itens.length === 0) throw new Error("Nenhum item foi contado ainda.");

  // "Reivindica" o fechamento com um UPDATE condicional ANTES de lançar os
  // ajustes — não depois. Um SELECT de status seguido de UPDATE no final
  // (check-then-act) deixa uma janela onde dois cliques (ou duas abas)
  // no botão "Concluir" passam os dois pela checagem antes de qualquer um
  // marcar CONCLUIDA, e cada um lança o AJUSTE de novo — dobra o ajuste de
  // saldo de verdade. Só quem de fato vira a linha de ABERTA/EM_CONTAGEM
  // pra CONCLUIDA (0 ou 1 linha afetada, atômico no Postgres) segue pra
  // lançar ajuste.
  const { data: reivindicada, error: erroClaim } = await admin
    .from("stock_contagens")
    .update({ status: "CONCLUIDA", concluido_em: new Date().toISOString() })
    .eq("id", contagemId)
    .in("status", ["ABERTA", "EM_CONTAGEM"])
    .select("id")
    .maybeSingle();
  if (erroClaim) throw new Error(erroClaim.message);
  if (!reivindicada) throw new Error("Essa contagem já foi concluída ou cancelada.");

  for (const item of itens) {
    const diff = Number(item.quantidade_contada) - Number(item.quantidade_esperada);
    if (diff === 0) continue;
    await inserirAjuste(admin, {
      produtoId: item.produto_id,
      localId: item.local_id,
      obraId: item.obra_id,
      corId: item.cor_id,
      quantidadeComSinal: diff,
      observacoes: `Ajuste por contagem de estoque`,
      usuarioId,
      origemTipo: "contagem",
      origemId: contagemId,
    });
  }

  revalidatePath("/squadstock/contagens");
  revalidatePath(`/squadstock/contagens/${contagemId}`);
  revalidatePath("/squadstock");
  revalidatePath("/squadstock/movimentacoes");
}

export async function cancelarContagem(contagemId: string) {
  await verificarPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  const admin = createAdminClient();
  const { error } = await admin
    .from("stock_contagens")
    .update({ status: "CANCELADA" })
    .eq("id", contagemId)
    .in("status", ["ABERTA", "EM_CONTAGEM"]);
  if (error) throw new Error(error.message);
  revalidatePath("/squadstock/contagens");
  revalidatePath(`/squadstock/contagens/${contagemId}`);
}

// Modo PAPEL — anexa a foto/scan do papel conferido depois da contagem
// manual. Bucket privado (mesmo padrão de squadmeasure/pedido-docs) — a
// leitura usa createSignedUrl, nunca URL pública direta.
export async function anexarComprovante(contagemId: string, formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  const admin = createAdminClient();

  const file = formData.get("arquivo") as File;
  if (!file || !file.name || file.size === 0) throw new Error("Selecione um arquivo.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["jpg", "jpeg", "png", "webp", "heic", "pdf"].includes(ext)) {
    throw new Error("Formato não suportado. Use foto (JPG/PNG/WEBP/HEIC) ou PDF.");
  }

  const caminho = `${contagemId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const { error: erroUpload } = await admin.storage.from("stock-contagens").upload(caminho, file);
  if (erroUpload) throw new Error(erroUpload.message);

  const { error } = await admin.from("stock_contagens").update({ foto_comprovante_url: caminho }).eq("id", contagemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/squadstock/contagens/${contagemId}`);
}
