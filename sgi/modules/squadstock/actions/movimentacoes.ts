"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";

// Registra uma SAÍDA (consumo) de material — sempre validando que não sai
// mais do que existe em saldo pra aquela obra/produto (mesmo espírito de
// registrar_recebimento, que valida contra o pendente do pedido antes de
// inserir).
export async function registrarSaida(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.MOVIMENTACAO_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const obraId = String(formData.get("obra_id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!obraId) throw new Error("Selecione a obra.");
  if (!produtoId) throw new Error("Selecione o produto.");
  if (!(quantidade > 0)) throw new Error("Quantidade precisa ser maior que zero.");

  const { data: saldo } = await admin
    .from("stock_saldos")
    .select("quantidade")
    .eq("produto_id", produtoId)
    .eq("obra_id", obraId)
    .maybeSingle();

  const saldoAtual = saldo?.quantidade ?? 0;
  if (quantidade > saldoAtual) {
    throw new Error(`Saldo insuficiente — disponível: ${saldoAtual}.`);
  }

  const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_movimento_estoque");
  if (erroNumero) throw new Error(erroNumero.message);

  const { error } = await admin.from("stock_movimentacoes").insert({
    numero,
    produto_id: produtoId,
    obra_id: obraId,
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

  const obraId = String(formData.get("obra_id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const direcao = String(formData.get("direcao") ?? "positivo");
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!obraId) throw new Error("Selecione a obra.");
  if (!produtoId) throw new Error("Selecione o produto.");
  if (!(quantidade > 0)) throw new Error("Quantidade precisa ser maior que zero.");
  if (!observacoes) throw new Error("Descreva o motivo do ajuste.");

  const quantidadeComSinal = direcao === "negativo" ? -quantidade : quantidade;

  if (quantidadeComSinal < 0) {
    const { data: saldo } = await admin
      .from("stock_saldos")
      .select("quantidade")
      .eq("produto_id", produtoId)
      .eq("obra_id", obraId)
      .maybeSingle();
    const saldoAtual = saldo?.quantidade ?? 0;
    if (quantidade > saldoAtual) {
      throw new Error(`Ajuste negativo maior que o saldo — disponível: ${saldoAtual}.`);
    }
  }

  const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_movimento_estoque");
  if (erroNumero) throw new Error(erroNumero.message);

  const { error } = await admin.from("stock_movimentacoes").insert({
    numero,
    produto_id: produtoId,
    obra_id: obraId,
    tipo: "AJUSTE",
    quantidade: quantidadeComSinal,
    origem_tipo: "manual",
    observacoes,
    usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/squadstock");
  revalidatePath("/squadstock/movimentacoes");
}
