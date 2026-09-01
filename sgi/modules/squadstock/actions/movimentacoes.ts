"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";

export async function buscarSaldoAtual(admin: ReturnType<typeof createAdminClient>, produtoId: string, localId: string, obraId: string | null, corId: string | null) {
  let q = admin.from("stock_saldos").select("quantidade").eq("produto_id", produtoId).eq("local_id", localId);
  q = obraId ? q.eq("obra_id", obraId) : q.is("obra_id", null);
  q = corId ? q.eq("cor_id", corId) : q.is("cor_id", null);
  const { data } = await q.maybeSingle();
  return data?.quantidade ?? 0;
}

// Miolo do insert de AJUSTE, reaproveitado pelo formulário manual
// (registrarAjuste) e pela reconciliação de contagem (concluirContagem em
// contagens.ts) — mesmo número gerado via RPC, mesma tabela, diferindo só em
// origem_tipo/origem_id (rastreabilidade até a sessão de contagem).
export async function inserirAjuste(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    produtoId: string;
    localId: string;
    obraId: string | null;
    corId: string | null;
    quantidadeComSinal: number;
    observacoes: string | null;
    usuarioId: string;
    origemTipo?: string;
    origemId?: string | null;
  }
) {
  const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_movimento_estoque");
  if (erroNumero) throw new Error(erroNumero.message);

  const { error } = await admin.from("stock_movimentacoes").insert({
    numero,
    produto_id: params.produtoId,
    local_id: params.localId,
    obra_id: params.obraId,
    cor_id: params.corId,
    tipo: "AJUSTE",
    quantidade: params.quantidadeComSinal,
    origem_tipo: params.origemTipo ?? "manual",
    origem_id: params.origemId ?? null,
    observacoes: params.observacoes,
    usuario_id: params.usuarioId,
  });
  if (error) throw new Error(error.message);
}

// Registra uma SAÍDA (consumo) de material — sempre validando que não sai
// mais do que existe em saldo pra aquele local/obra/produto (mesmo espírito
// de registrar_recebimento, que valida contra o pendente do pedido antes de
// inserir).
export async function registrarSaida(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.MOVIMENTACAO_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const localId = String(formData.get("local_id") ?? "");
  const obraId = String(formData.get("obra_id") ?? "").trim() || null;
  const produtoId = String(formData.get("produto_id") ?? "");
  const corId = String(formData.get("cor_id") ?? "").trim() || null;
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!localId) throw new Error("Selecione o local.");
  if (!produtoId) throw new Error("Selecione o produto.");
  if (!(quantidade > 0)) throw new Error("Quantidade precisa ser maior que zero.");

  const saldoAtual = await buscarSaldoAtual(admin, produtoId, localId, obraId, corId);
  if (quantidade > saldoAtual) {
    throw new Error(`Saldo insuficiente — disponível: ${saldoAtual}.`);
  }

  const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_movimento_estoque");
  if (erroNumero) throw new Error(erroNumero.message);

  const { error } = await admin.from("stock_movimentacoes").insert({
    numero,
    produto_id: produtoId,
    local_id: localId,
    obra_id: obraId,
    cor_id: corId,
    tipo: "SAIDA",
    quantidade: -quantidade,
    origem_tipo: "manual",
    observacoes,
    usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/squadstock");
  revalidatePath("/squadstock/movimentacoes");
}

// Ajuste manual — correção de saldo (contagem física), pode ser positivo
// (achou mais do que o sistema tinha) ou negativo (achou menos).
export async function registrarAjuste(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.MOVIMENTACAO_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const localId = String(formData.get("local_id") ?? "");
  const obraId = String(formData.get("obra_id") ?? "").trim() || null;
  const produtoId = String(formData.get("produto_id") ?? "");
  const corId = String(formData.get("cor_id") ?? "").trim() || null;
  const direcao = String(formData.get("direcao") ?? "positivo");
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!localId) throw new Error("Selecione o local.");
  if (!produtoId) throw new Error("Selecione o produto.");
  if (!(quantidade > 0)) throw new Error("Quantidade precisa ser maior que zero.");
  if (!observacoes) throw new Error("Descreva o motivo do ajuste.");

  const quantidadeComSinal = direcao === "negativo" ? -quantidade : quantidade;

  if (quantidadeComSinal < 0) {
    const saldoAtual = await buscarSaldoAtual(admin, produtoId, localId, obraId, corId);
    if (quantidade > saldoAtual) {
      throw new Error(`Ajuste negativo maior que o saldo — disponível: ${saldoAtual}.`);
    }
  }

  await inserirAjuste(admin, {
    produtoId,
    localId,
    obraId,
    corId,
    quantidadeComSinal,
    observacoes,
    usuarioId,
  });

  revalidatePath("/squadstock");
  revalidatePath("/squadstock/movimentacoes");
}
