"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";

// 10 níveis = profundidade 0..9 (raiz = 0).
const PROFUNDIDADE_MAXIMA_INDEX = 9;

// Profundidade do nó (0 = raiz), subindo pela cadeia parent_id.
async function calcularProfundidade(admin: ReturnType<typeof createAdminClient>, noId: string): Promise<number> {
  let profundidade = 0;
  let atualId: string | null = noId;
  while (atualId) {
    const { data }: { data: { parent_id: string | null } | null } =
      await admin.from("stock_locais").select("parent_id").eq("id", atualId).maybeSingle();
    atualId = data?.parent_id ?? null;
    if (atualId) profundidade++;
  }
  return profundidade;
}

// Valida um (re)parenting antes de gravar — usado tanto por criarNo/editarNo
// (via formulário) quanto por moverNo (via drag-and-drop na árvore): não
// virar pai de si mesmo, não criar ciclo (o novo pai não pode ser
// descendente do próprio nó) e não estourar o limite de 10 níveis.
async function validarNovoPai(admin: ReturnType<typeof createAdminClient>, id: string | null, novoParentId: string) {
  if (novoParentId === id) throw new Error("Um nó não pode ser pai de si mesmo.");

  let atualId: string | null = novoParentId;
  while (atualId) {
    if (atualId === id) throw new Error("Não é possível mover um nó pra dentro de um dos seus próprios descendentes.");
    const { data }: { data: { parent_id: string | null } | null } =
      await admin.from("stock_locais").select("parent_id").eq("id", atualId).maybeSingle();
    atualId = data?.parent_id ?? null;
  }

  const profundidadePai = await calcularProfundidade(admin, novoParentId);
  if (profundidadePai >= PROFUNDIDADE_MAXIMA_INDEX) {
    throw new Error(`Limite de ${PROFUNDIDADE_MAXIMA_INDEX + 1} níveis atingido.`);
  }
}

export async function criarNo(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.MAPA_GERENCIAR);
  const admin = createAdminClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const nivelTipo = String(formData.get("nivel_tipo") ?? "").trim() || null;
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0) || 0;

  if (!nome) throw new Error("Informe o nome.");

  if (parentId) {
    const profundidadePai = await calcularProfundidade(admin, parentId);
    if (profundidadePai >= PROFUNDIDADE_MAXIMA_INDEX) {
      throw new Error(`Limite de ${PROFUNDIDADE_MAXIMA_INDEX + 1} níveis atingido.`);
    }
  }

  const { error } = await admin.from("stock_locais").insert({
    nome,
    nivel_tipo: nivelTipo,
    parent_id: parentId,
    ordem,
    // tipo (GALPAO/FILIAL/OUTRO) só é significativo em nós de raiz —
    // sub-níveis usam nivel_tipo (texto livre) pra se descrever.
    tipo: parentId ? "OUTRO" : "GALPAO",
  });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um nó com esse nome no mesmo nível.");
    throw new Error(error.message);
  }

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}

export async function editarNo(id: string, formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.MAPA_GERENCIAR);
  const admin = createAdminClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const nivelTipo = String(formData.get("nivel_tipo") ?? "").trim() || null;
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0) || 0;

  if (!nome) throw new Error("Informe o nome.");
  if (parentId) await validarNovoPai(admin, id, parentId);

  const { error } = await admin
    .from("stock_locais")
    .update({ nome, nivel_tipo: nivelTipo, parent_id: parentId, ordem })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um nó com esse nome no destino.");
    throw new Error(error.message);
  }

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}

// Reparenting via drag-and-drop no mapa — mesma validação de editarNo, mas
// mexe só em parent_id (nome/nivel_tipo/ordem ficam como estavam, o form
// de edição continua sendo o lugar certo pra mudar esses outros campos).
export async function moverNo(id: string, novoParentId: string | null) {
  await verificarPermissao(STOCK_PERMISSIONS.MAPA_GERENCIAR);
  const admin = createAdminClient();

  if (novoParentId) await validarNovoPai(admin, id, novoParentId);

  const { error } = await admin.from("stock_locais").update({ parent_id: novoParentId }).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um nó com esse nome no destino.");
    throw new Error(error.message);
  }

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}

// Só apaga nó-folha (sem filhos) e sem saldo de produto — subárvores
// precisam ser esvaziadas de baixo pra cima, mesmo espírito de
// apagarAba() no catálogo.
export async function desativarNo(id: string) {
  await verificarPermissao(STOCK_PERMISSIONS.MAPA_GERENCIAR);
  const admin = createAdminClient();

  const { count: filhos } = await admin
    .from("stock_locais")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);
  if ((filhos ?? 0) > 0) {
    throw new Error("Este nó tem filhos — apague ou mova os filhos antes.");
  }

  const { data: saldos } = await admin
    .from("stock_saldos")
    .select("quantidade")
    .eq("local_id", id)
    .gt("quantidade", 0)
    .limit(1);
  if (saldos && saldos.length > 0) {
    throw new Error("Este local tem saldo de produto — registre saída/ajuste até zerar antes de apagar.");
  }

  const { error } = await admin.from("stock_locais").update({ ativo: false }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}
