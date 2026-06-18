"use server";

import { createAdminClient as createClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function criarObra(formData: FormData) {
  const supabase = createClient();

  const nome = String(formData.get("nome") || "").trim();
  const cliente_nome = String(formData.get("cliente_nome") || "").trim();
  const status_nome = String(formData.get("status_nome") || "").trim();
  const endereco = String(formData.get("endereco") || "");
  const cidade = String(formData.get("cidade") || "");
  const estado = String(formData.get("estado") || "");
  const cep = String(formData.get("cep") || "");
  const observacoes = String(formData.get("observacoes") || "");

  if (!nome || !cliente_nome) {
    throw new Error("Nome e cliente são obrigatórios.");
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

  revalidatePath("/obras");
  redirect(`/obras/${data.id}`);
}

export async function adicionarTipologia(obraId: string, formData: FormData) {
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

  revalidatePath(`/obras/${obraId}`);
}
