"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarTarefaAutomatica } from "@/lib/tarefas";
import { getSetorComprasId, garantirColunasCompras, colunaPorStatusPedido, moverTarefaPedido } from "@/lib/kanban-compras";

async function getUsuarioId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const admin = createAdminClient();
  const { data } = await admin.from("usuarios").select("id").eq("auth_id", user.id).single();
  return data?.id as string;
}

async function getUsuario() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const admin = createAdminClient();
  const { data } = await admin.from("usuarios").select("id, setor_id, nome").eq("auth_id", user.id).single();
  return data as { id: string; setor_id: string | null; nome: string };
}

async function getSetorCompras(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("setores")
    .select("id")
    .ilike("nome", "%compra%")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function registrarAssinatura(
  admin: ReturnType<typeof createAdminClient>,
  usuario_id: string,
  entidade: string,
  entidade_id: string,
  acao: string,
) {
  const { data } = await admin.from("assinaturas").select("texto").eq("usuario_id", usuario_id).single();
  if (!data?.texto) return;
  await admin.from("assinatura_eventos").insert({ usuario_id, entidade, entidade_id, acao, texto: data.texto });
}

async function registrarHistorico(
  admin: ReturnType<typeof createAdminClient>,
  entidade: string,
  entidade_id: string,
  usuario_id: string,
  acao: string,
  dados?: object,
) {
  await admin.from("compra_historico").insert({ entidade, entidade_id, usuario_id, acao, dados });
}

// ── Solicitações ─────────────────────────────────────────────────

export async function criarSolicitacao(formData: FormData) {
  const admin = createAdminClient();
  const usuario = await getUsuario();
  const usuario_id = usuario.id;

  const obra_id       = formData.get("obra_id") as string | null;
  const origem        = formData.get("origem") as string;
  const prioridade    = formData.get("prioridade") as string;
  const justificativa = formData.get("justificativa") as string | null;
  const observacoes   = formData.get("observacoes") as string | null;
  const itensJson     = formData.get("itens") as string;

  if (!itensJson) throw new Error("Adicione ao menos um item.");
  const itens: {
    produto_id?: string | null;
    descricao_manual?: string;
    quantidade: number;
    unidade: string;
    observacoes?: string;
    cor_id?: string | null;
  }[] = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Adicione ao menos um item.");

  // Valida produtos do catálogo: rejeita inativos
  const produtoIds = itens.map((i) => i.produto_id).filter(Boolean) as string[];
  if (produtoIds.length > 0) {
    const { data: inativos } = await admin
      .from("produtos")
      .select("codigo_mestre, nome")
      .in("id", produtoIds)
      .eq("status", false);
    if (inativos && inativos.length > 0) {
      const nomes = inativos.map((p) => `${p.codigo_mestre} — ${p.nome}`).join(", ");
      throw new Error(`Produto(s) inativo(s) não podem ser solicitados: ${nomes}`);
    }
  }

  const { data: sol, error } = await admin
    .from("solicitacoes_compra")
    .insert({ obra_id: obra_id || null, origem, prioridade, justificativa, observacoes, solicitante_id: usuario_id })
    .select("id, numero")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("solicitacao_itens").insert(
    itens.map((i) => {
      const { cor_id, ...rest } = i;
      return cor_id ? { solicitacao_id: sol.id, ...rest, cor_id } : { solicitacao_id: sol.id, ...rest };
    })
  );

  await registrarHistorico(admin, "solicitacao", sol.id, usuario_id, "CRIADA", { numero: sol.numero });
  await registrarAssinatura(admin, usuario_id, "solicitacao", sol.id, "CRIADA");

  const setorComprasIdSol = await getSetorComprasId();
  if (setorComprasIdSol) {
    const colunasMapSol = await garantirColunasCompras(setorComprasIdSol);
    await criarTarefaAutomatica({
      titulo: `Solicitação ${sol.numero} — aguardando pedido`,
      setor_id: setorComprasIdSol,
      origem: "COMPRA",
      entidade_ref: "solicitacao",
      entidade_ref_id: sol.id,
      obra_id: (obra_id as string) ?? undefined,
      prioridade: prioridade === "URGENTE" ? "ALTA" : "MEDIA",
      criado_por: usuario_id,
      coluna_id: colunasMapSol["Solicitações abertas"],
    });
  }

  revalidatePath("/compras");
  revalidatePath("/compras/solicitacoes");
  revalidatePath("/");
  revalidatePath("/tarefas");
  redirect(`/compras/solicitacoes/${sol.id}`);
}

export async function alterarStatusSolicitacao(
  id: string, status: string, observacoes?: string
) {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { error } = await admin.from("solicitacoes_compra").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await registrarHistorico(admin, "solicitacao", id, usuario_id, `STATUS_${status}`, { observacoes });
  await registrarAssinatura(admin, usuario_id, "solicitacao", id, `STATUS_${status}`);
  revalidatePath("/compras");
  revalidatePath("/compras/solicitacoes");
  revalidatePath(`/compras/solicitacoes/${id}`);
}

// ── Pedidos ──────────────────────────────────────────────────────

async function gerarNumeroPedido(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const { data } = await admin
    .from("pedidos_compra")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1);

  const last = data?.[0]?.numero ? parseInt(data[0].numero as string, 10) : NaN;
  const next = isNaN(last) || last < 1000 ? 1000 : last + 1;
  return String(next);
}

export async function criarPedido(formData: FormData) {
  const admin = createAdminClient();
  const usuario = await getUsuario();
  const usuario_id = usuario.id;

  const obra_id             = (formData.get("obra_id") as string | null) || null;
  const fornecedor_id       = formData.get("fornecedor_id") as string;
  const forma_pagamento_id  = (formData.get("forma_pagamento_id") as string | null) || null;
  const cor_id              = (formData.get("cor_id") as string | null) || null;
  const observacoes         = formData.get("observacoes") as string | null;
  const tipo_linha          = (formData.get("tipo_linha") as string | null) || null;
  const numeroVinculo       = ((formData.get("numero_vinculo") as string | null) || "").trim() || null;
  const itensJson           = formData.get("itens") as string;

  if (!fornecedor_id) throw new Error("Selecione um fornecedor.");
  const itens: {
    produto_id: string; descricao_snapshot: string; quantidade_pedida: number;
    unidade: string; preco_unitario?: number; codigo_fornecedor?: string;
    produto_fornecedor_id?: string; obra_id?: string; solicitacao_item_id?: string;
    largura_m?: number | null; altura_m?: number | null; qtd_pecas?: number | null;
    cor_id?: string | null;
  }[] = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Adicione ao menos um item.");

  // Valida produtos do catálogo: rejeita inativos
  const produtoIdsPed = itens.map((i) => i.produto_id).filter(Boolean);
  if (produtoIdsPed.length > 0) {
    const { data: inativosPed } = await admin
      .from("produtos")
      .select("codigo_mestre, nome")
      .in("id", produtoIdsPed)
      .eq("status", false);
    if (inativosPed && inativosPed.length > 0) {
      const nomes = inativosPed.map((p) => `${p.codigo_mestre} — ${p.nome}`).join(", ");
      throw new Error(`Produto(s) inativo(s) no pedido: ${nomes}`);
    }
  }

  // Para CHAPA: enriquece descricao_snapshot com dimensões (permanente — aparece em recebimento, histórico, etc.)
  const itensProcessados = itens.map((i) => {
    const chapa = ["CHAPA","M2","M²"].includes((i.unidade ?? "").toUpperCase());
    if (chapa && i.largura_m && i.altura_m) {
      const lMm = Math.round(i.largura_m * 1000);
      const aMm = Math.round(i.altura_m * 1000);
      const qtd = i.qtd_pecas ?? 1;
      const dimensoes = `${qtd}× ${lMm}L × ${aMm}A mm`;
      return { ...i, descricao_snapshot: `${i.descricao_snapshot} — ${dimensoes}` };
    }
    return i;
  });

  // Se número de vínculo fornecido, verifica se já existe e redireciona
  if (numeroVinculo) {
    const { data: pedidoExistente } = await admin
      .from("pedidos_compra")
      .select("id")
      .eq("numero", numeroVinculo)
      .maybeSingle();
    if (pedidoExistente) {
      redirect(`/compras/pedidos/${pedidoExistente.id}`);
    }
  }

  const numero = numeroVinculo ?? await gerarNumeroPedido(admin);

  const pedidoPayload: any = { numero, obra_id, fornecedor_id, forma_pagamento_id, comprador_id: usuario_id, observacoes, tipo_linha };
  if (cor_id) pedidoPayload.cor_id = cor_id;

  const { data: ped, error } = await admin
    .from("pedidos_compra")
    .insert(pedidoPayload)
    .select("id, numero")
    .single();
  if (error) throw new Error(error.message);

  const { error: insErr2 } = await admin.from("pedido_itens").insert(
    itensProcessados.map((i) => {
      const { cor_id, ...rest } = { pedido_id: ped.id, ...i } as any;
      return cor_id ? { ...rest, cor_id } : rest;
    })
  );
  if (insErr2) throw new Error(insErr2.message);

  await registrarHistorico(admin, "pedido", ped.id, usuario_id, "CRIADO", { numero: ped.numero });
  await registrarAssinatura(admin, usuario_id, "pedido", ped.id, "CRIADO");

  const setorComprasId = await getSetorComprasId();
  if (setorComprasId) {
    const colunasMap = await garantirColunasCompras(setorComprasId);
    await criarTarefaAutomatica({
      titulo: `Pedido ${ped.numero} — rascunho`,
      setor_id: setorComprasId,
      origem: "COMPRA",
      entidade_ref: "pedido",
      entidade_ref_id: ped.id,
      pedido_id: ped.id,
      obra_id: obra_id ?? undefined,
      prioridade: "MEDIA",
      criado_por: usuario_id,
      coluna_id: colunasMap["Rascunho"],
    });
  }

  revalidatePath("/compras");
  revalidatePath("/compras/pedidos");
  revalidatePath("/");
  revalidatePath("/tarefas");
  redirect(`/compras/pedidos/${ped.id}`);
}

export async function alterarStatusPedido(
  id: string, status: string, observacoes?: string
) {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { error } = await admin.from("pedidos_compra").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  // Quando aprovado: marca solicitações vinculadas como EM_PEDIDO
  if (status === "APROVADO") {
    const { data: itens } = await admin
      .from("pedido_itens")
      .select("solicitacao_item_id")
      .eq("pedido_id", id)
      .not("solicitacao_item_id", "is", null);
    if (itens?.length) {
      const solItemIds = itens.map((i) => i.solicitacao_item_id);
      const { data: solItens } = await admin
        .from("solicitacao_itens")
        .select("solicitacao_id")
        .in("id", solItemIds);
      if (solItens?.length) {
        const solIds = Array.from(new Set(solItens.map((si) => si.solicitacao_id)));
        await admin.from("solicitacoes_compra").update({ status: "EM_PEDIDO" }).in("id", solIds);
        revalidatePath("/compras/solicitacoes");
      }
    }
  }

  // Move o card do Kanban para a coluna correspondente ao novo status
  await moverTarefaPedido(id, status, usuario_id);

  await registrarHistorico(admin, "pedido", id, usuario_id, `STATUS_${status}`, { observacoes });
  await registrarAssinatura(admin, usuario_id, "pedido", id, `STATUS_${status}`);
  revalidatePath("/compras");
  revalidatePath("/compras/pedidos");
  revalidatePath(`/compras/pedidos/${id}`);
}

export async function editarPedido(id: string, formData: FormData) {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const fornecedor_id    = formData.get("fornecedor_id") as string;
  const obra_id          = (formData.get("obra_id") as string) || null;
  const forma_pagamento_id = (formData.get("forma_pagamento_id") as string) || null;
  const cor_id           = (formData.get("cor_id") as string) || null;
  const observacoes      = (formData.get("observacoes") as string) || null;
  const prazo_entrega    = (formData.get("prazo_entrega") as string) || null;
  const itens = JSON.parse(formData.get("itens") as string) as any[];

  const updatePayload: any = { fornecedor_id, obra_id, forma_pagamento_id, observacoes, prazo_entrega };
  if (cor_id) updatePayload.cor_id = cor_id;
  const { error } = await admin.from("pedidos_compra").update(updatePayload).eq("id", id);
  if (error) throw new Error(error.message);

  const itensProcessados = itens.map((i: any) => {
    const chapa = ["CHAPA","M2","M²"].includes((i.unidade ?? "").toUpperCase());
    if (chapa && i.largura_m && i.altura_m) {
      const lMm = Math.round(i.largura_m * 1000);
      const aMm = Math.round(i.altura_m * 1000);
      const qtd = i.qtd_pecas ?? 1;
      return { ...i, descricao_snapshot: `${i.descricao_snapshot} — ${qtd}× ${lMm}L × ${aMm}A mm` };
    }
    return i;
  });

  const { error: delErr } = await admin.from("pedido_itens").delete().eq("pedido_id", id);
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await admin.from("pedido_itens").insert(
    itensProcessados.map((i: any) => {
      const { cor_id, ...rest } = { pedido_id: id, ...i };
      return cor_id ? { ...rest, cor_id } : rest;
    })
  );
  if (insErr) throw new Error(insErr.message);

  await registrarHistorico(admin, "pedido", id, usuario_id, "EDITADO", {});
  await registrarAssinatura(admin, usuario_id, "pedido", id, "EDITADO");
  revalidatePath(`/compras/pedidos/${id}`);
  revalidatePath(`/compras/pedidos/${id}/editar`);
  return { id };
}

// ── Recebimento ──────────────────────────────────────────────────

export async function registrarRecebimento(
  pedidoId: string,
  dataRecebimento: string,
  observacoes: string,
  itens: { pedido_item_id: string; quantidade_recebida: number; observacoes?: string }[]
) {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: rec, error: errRec } = await admin
    .from("recebimentos")
    .insert({ pedido_id: pedidoId, responsavel_id: usuario_id, data_recebimento: dataRecebimento, observacoes })
    .select("id")
    .single();
  if (errRec) throw new Error(errRec.message);

  const itemsValidos = itens.filter((i) => i.quantidade_recebida > 0);
  if (!itemsValidos.length) throw new Error("Informe ao menos uma quantidade.");

  await admin.from("recebimento_itens").insert(
    itemsValidos.map((i) => ({ recebimento_id: rec.id, ...i }))
  );

  // Recalcula status do pedido com base nos saldos
  const { data: pedItens } = await admin
    .from("vw_pedido_itens")
    .select("saldo_pendente")
    .eq("pedido_id", pedidoId);

  const saldos = (pedItens ?? []).map((r: any) => Number(r.saldo_pendente));
  const totalPendente = saldos.reduce((a, b) => a + b, 0);
  const novoStatus = totalPendente <= 0 ? "RECEBIDO" : "RECEBIDO_PARCIAL";

  await admin.from("pedidos_compra").update({ status: novoStatus }).eq("id", pedidoId);
  await registrarHistorico(admin, "pedido", pedidoId, usuario_id, `STATUS_${novoStatus}`, {
    recebimento_id: rec.id,
  });
  await registrarAssinatura(admin, usuario_id, "pedido", pedidoId, "RECEBIMENTO");

  revalidatePath("/compras");
  revalidatePath("/compras/pedidos");
  revalidatePath(`/compras/pedidos/${pedidoId}`);
}

// ── Anotações ────────────────────────────────────────────────────

export async function adicionarAnotacao(pedidoId: string, texto: string) {
  if (!texto.trim()) throw new Error("Anotação não pode estar vazia.");
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { data: ped } = await admin.from("pedidos_compra").select("status").eq("id", pedidoId).single();
  await admin.from("pedido_anotacoes").insert({
    pedido_id: pedidoId, usuario_id,
    status_pedido: ped?.status ?? null,
    texto: texto.trim(),
  });
  revalidatePath(`/compras/pedidos/${pedidoId}`);
}

// ── Documentos ───────────────────────────────────────────────────

export async function obterUrlUploadDocumento(pedidoId: string, nomeArquivo: string) {
  const admin = createAdminClient();
  const safe = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `pedidos/${pedidoId}/${Date.now()}-${safe}`;
  const { data, error } = await admin.storage.from("pedido-docs").createSignedUploadUrl(caminho);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, token: data.token, caminho };
}

export async function registrarDocumento(pedidoId: string, nome: string, caminho: string, tamanho: number) {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { error } = await admin.from("pedido_documentos").insert({
    pedido_id: pedidoId, usuario_id, nome_arquivo: nome, caminho_storage: caminho, tamanho_bytes: tamanho,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/compras/pedidos/${pedidoId}`);
}

export async function excluirDocumento(documentoId: string) {
  const admin = createAdminClient();
  const { data: doc } = await admin.from("pedido_documentos")
    .select("pedido_id, caminho_storage").eq("id", documentoId).single();
  if (!doc) throw new Error("Documento não encontrado.");
  await admin.storage.from("pedido-docs").remove([doc.caminho_storage]);
  await admin.from("pedido_documentos").delete().eq("id", documentoId);
  revalidatePath(`/compras/pedidos/${doc.pedido_id}`);
}

export async function gerarUrlDownload(caminho: string) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("pedido-docs").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? null;
}

// ── Formas de Pagamento ──────────────────────────────────────────

export async function criarFormaPagamento(formData: FormData) {
  const admin = createAdminClient();
  const nome      = (formData.get("nome") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await admin.from("formas_pagamento").insert({ nome, descricao });
  if (error) throw new Error(error.message);
  revalidatePath("/compras/fornecedores");
}

export async function alterarFormaPagamento(id: string, ativo: boolean) {
  const admin = createAdminClient();
  await admin.from("formas_pagamento").update({ ativo }).eq("id", id);
  revalidatePath("/compras/fornecedores");
}

// ── Fornecedores ─────────────────────────────────────────────────

export async function criarFornecedor(formData: FormData) {
  const admin = createAdminClient();
  const g = (k: string) => (formData.get(k) as string | null)?.trim() || null;
  const nome  = (formData.get("nome") as string).trim();
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await admin.from("fornecedores").insert({
    nome, tipos,
    razao_social: g("razao_social"), cnpj: g("cnpj"),
    email: g("email"), telefone: g("telefone"), contato: g("contato"),
    endereco: g("endereco"), numero: g("numero"), complemento: g("complemento"),
    bairro: g("bairro"), cidade: g("cidade"), estado: g("estado"), cep: g("cep"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/compras/fornecedores");
}

export async function editarFornecedor(id: string, formData: FormData) {
  const admin = createAdminClient();
  const g = (k: string) => (formData.get(k) as string | null)?.trim() || null;
  const nome  = (formData.get("nome") as string).trim();
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await admin.from("fornecedores").update({
    nome, tipos,
    razao_social: g("razao_social"), cnpj: g("cnpj"),
    email: g("email"), telefone: g("telefone"), contato: g("contato"),
    endereco: g("endereco"), numero: g("numero"), complemento: g("complemento"),
    bairro: g("bairro"), cidade: g("cidade"), estado: g("estado"), cep: g("cep"),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compras/fornecedores");
}

// ── Exclusões ─────────────────────────────────────────────────────

export async function excluirSolicitacoes(ids: string[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  await admin.from("solicitacao_itens").delete().in("solicitacao_id", ids);
  const { error } = await admin.from("solicitacoes_compra").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/compras/solicitacoes");
}

export async function excluirPedidos(ids: string[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  // Remove dependentes em ordem (ignora erro se tabela não tiver linhas)
  await admin.from("pedido_anotacoes").delete().in("pedido_id", ids);
  await admin.from("pedido_documentos").delete().in("pedido_id", ids);
  const { data: recs } = await admin.from("recebimentos").select("id").in("pedido_id", ids);
  if (recs?.length) {
    await admin.from("recebimento_itens").delete().in("recebimento_id", recs.map((r) => r.id));
    await admin.from("recebimentos").delete().in("pedido_id", ids);
  }
  await admin.from("pedido_itens").delete().in("pedido_id", ids);
  const { error } = await admin.from("pedidos_compra").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/compras/pedidos");
}

export async function excluirFornecedores(ids: string[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  const { error } = await admin.from("fornecedores").delete().in("id", ids);
  if (error) throw new Error("Não é possível excluir: há pedidos ou registros vinculados a esse fornecedor.");
  revalidatePath("/compras/fornecedores");
}

export async function excluirFormasPagamento(ids: string[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  const { error } = await admin.from("formas_pagamento").delete().in("id", ids);
  if (error) throw new Error("Não é possível excluir: há pedidos vinculados a essa forma de pagamento.");
  revalidatePath("/compras/formas-pagamento");
}
