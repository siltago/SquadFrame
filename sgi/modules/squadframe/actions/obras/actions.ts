"use server";

import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { verificarPermissao } from "@/shared/auth/check-permission";

export async function criarObra(formData: FormData) {
  await verificarPermissao("obras.criar");

  const supabase = createClient();

  const nome = String(formData.get("nome") || "").trim();
  const cliente_nome = String(formData.get("cliente_nome") || "").trim();
  const status_nome = String(formData.get("status_nome") || "").trim();
  const endereco = String(formData.get("endereco") || "");
  const cidade = String(formData.get("cidade") || "");
  const estado = String(formData.get("estado") || "");
  const cep = String(formData.get("cep") || "");
  const observacoes = String(formData.get("observacoes") || "");
  const codigoVinculo = String(formData.get("codigo") || "").trim() || null;

  if (!nome || !cliente_nome) {
    throw new Error("Nome e cliente são obrigatórios.");
  }

  // Se um código de vínculo foi informado e já existe, redireciona para a obra existente
  if (codigoVinculo) {
    const { data: obraExistente } = await supabase
      .from("obras")
      .select("id")
      .eq("codigo", codigoVinculo)
      .maybeSingle();
    if (obraExistente) {
      redirect(`/squadframe/obras/${obraExistente.id}`);
    }
  }

  // Resolve cliente_id a partir do nome
  let cliente_id: string;
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome", cliente_nome)
    .maybeSingle();

  if (clienteExistente) {
    cliente_id = clienteExistente.id;
  } else {
    const { data: novoCliente, error: errCliente } = await supabase
      .from("clientes")
      .insert({ nome: cliente_nome })
      .select("id")
      .single();
    if (errCliente) throw new Error(errCliente.message);
    cliente_id = novoCliente.id;
  }

  // Resolve status_id a partir do nome
  let status_id: string;
  const { data: statusEncontrado } = await supabase
    .from("obra_status")
    .select("id")
    .ilike("nome", status_nome)
    .maybeSingle();

  if (statusEncontrado) {
    status_id = statusEncontrado.id;
  } else {
    const { data: primeiroStatus, error: errStatus } = await supabase
      .from("obra_status")
      .select("id")
      .order("ordem", { ascending: true })
      .limit(1)
      .single();
    if (errStatus) throw new Error(errStatus.message);
    status_id = primeiroStatus.id;
  }

  const { data, error } = await supabase
    .from("obras")
    .insert({
      nome,
      cliente_id,
      status_id,
      endereco,
      cidade,
      estado: estado || null,
      cep,
      observacoes,
      ...(codigoVinculo ? { codigo: codigoVinculo } : {}),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Histórico imutável: registra a criação.
  await supabase.from("obra_historico").insert({
    obra_id: data.id,
    acao: "OBRA_CRIADA",
    valor_novo: { nome, cliente_id, status_id },
  });

  revalidatePath("/squadframe/obras");
  redirect(`/squadframe/obras/${data.id}`);
}

export async function buscarStatusObra() {
  const supabase = createClient();
  const { data } = await supabase
    .from("obra_status")
    .select("id, nome, cor")
    .order("ordem", { ascending: true });
  return (data ?? []) as { id: string; nome: string; cor: string }[];
}

export async function alterarStatusObra(obraId: string, statusId: string, motivo?: string) {
  await verificarPermissao("obras.editar");
  const supabase = createClient();

  const { error } = await supabase
    .from("obras")
    .update({ status_id: statusId })
    .eq("id", obraId);

  if (error) throw new Error(error.message);

  const { data: status } = await supabase
    .from("obra_status")
    .select("nome")
    .eq("id", statusId)
    .single();

  await supabase.from("obra_historico").insert({
    obra_id: obraId,
    acao: "STATUS_ALTERADO",
    valor_novo: { status_id: statusId, status_nome: status?.nome },
    motivo: motivo || null,
  });

  revalidatePath(`/squadframe/obras/${obraId}`);
  revalidatePath("/squadframe/obras");
}

export async function importarTipologias(
  obraId: string,
  loteNome: string,
  tipologiasJson: string,
) {
  await verificarPermissao("obras.editar");
  const supabase = createClient();

  const itens: Array<{
    nome: string; quantidade: number;
    codigo_esquadria: string | null; tipo: string | null;
    largura_mm: number | null; altura_mm: number | null;
    tratamento: string | null; descricao: string | null;
    peso_unit: number | null; preco_unit: number | null;
  }> = JSON.parse(tipologiasJson);

  if (!itens.length) throw new Error("Nenhuma tipologia para importar.");

  // Cria o lote
  const { data: lote, error: errLote } = await supabase
    .from("lotes_obra")
    .insert({ obra_id: obraId, nome: loteNome })
    .select("id")
    .single();
  if (errLote) throw new Error(errLote.message);

  const rows = itens.map((t) => ({ obra_id: obraId, lote_id: lote.id, ...t }));
  const { error } = await supabase.from("tipologias_obra").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.from("obra_historico").insert({
    obra_id: obraId,
    acao: "XML_IMPORTADO",
    valor_novo: { lote: loteNome, tipologias: rows.length },
  });

  revalidatePath(`/squadframe/obras/${obraId}`);
  return { ok: true, importadas: rows.length, loteId: lote.id };
}

export async function excluirLote(loteId: string, obraId: string) {
  await verificarPermissao("obras.editar");
  const supabase = createClient();
  const { error } = await supabase.from("lotes_obra").delete().eq("id", loteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/squadframe/obras/${obraId}`);
}

export async function editarTipologia(
  tipologiaId: string,
  obraId: string,
  dados: {
    nome: string; quantidade: number; status: string;
    codigo_esquadria: string | null; tipo: string | null;
    largura_mm: number | null; altura_mm: number | null;
    tratamento: string | null; descricao: string | null;
    peso_unit: number | null; preco_unit: number | null;
  },
) {
  await verificarPermissao("obras.editar");
  const supabase = createClient();
  const { error } = await supabase
    .from("tipologias_obra")
    .update(dados)
    .eq("id", tipologiaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/squadframe/obras/${obraId}`);
}

export async function adicionarTipologia(obraId: string, formData: FormData) {
  await verificarPermissao("obras.criar", "obras.editar");
  const supabase = createClient();
  const nome = String(formData.get("nome") || "").trim();
  const quantidade = parseInt(String(formData.get("quantidade") || "1"), 10);

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase.from("tipologias_obra").insert({
    obra_id: obraId,
    nome,
    quantidade: isNaN(quantidade) || quantidade < 1 ? 1 : quantidade,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/squadframe/obras/${obraId}`);
}

export async function editarObra(obraId: string, formData: FormData) {
  await verificarPermissao("obras.editar");
  const supabase = createClient();
  const usuario = await getUsuarioAtual();

  const nome = String(formData.get("nome") || "").trim();
  const cliente_nome = String(formData.get("cliente_nome") || "").trim();
  const endereco = String(formData.get("endereco") || "");
  const cidade = String(formData.get("cidade") || "");
  const estado = String(formData.get("estado") || "");
  const cep = String(formData.get("cep") || "");
  const data_prevista = String(formData.get("data_prevista") || "") || null;
  const observacoes = String(formData.get("observacoes") || "");

  if (!nome || !cliente_nome) throw new Error("Nome e cliente são obrigatórios.");

  let cliente_id: string;
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome", cliente_nome)
    .maybeSingle();

  if (clienteExistente) {
    cliente_id = clienteExistente.id;
  } else {
    const { data: novoCliente, error: errCliente } = await supabase
      .from("clientes")
      .insert({ nome: cliente_nome })
      .select("id")
      .single();
    if (errCliente) throw new Error(errCliente.message);
    cliente_id = novoCliente.id;
  }

  const { error } = await supabase
    .from("obras")
    .update({ nome, cliente_id, endereco, cidade, estado: estado || null, cep, data_prevista, observacoes })
    .eq("id", obraId);
  if (error) throw new Error(error.message);

  await supabase.from("obra_historico").insert({
    obra_id: obraId,
    acao: "OBRA_EDITADA",
    valor_novo: { nome, cliente_nome },
    usuario_id: usuario?.id ?? null,
  });

  revalidatePath(`/squadframe/obras/${obraId}`);
  revalidatePath(`/squadframe/obras/${obraId}/editar`);
  revalidatePath("/squadframe/obras");
  return { id: obraId };
}
