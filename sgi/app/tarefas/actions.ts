"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { criarTarefaAutomatica } from "@/lib/tarefas";
import { garantirColunasCompras } from "@/lib/kanban-compras";

async function usuarioAtualId(): Promise<string | null> {
  const u = await getUsuarioAtual();
  return u?.id ?? null;
}

export async function criarTarefa(formData: FormData) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const titulo = (formData.get("titulo") as string)?.trim();
  if (!titulo) return { ok: false, erro: "Título obrigatório" };

  const { data, error } = await admin
    .from("tarefas")
    .insert({
      titulo,
      descricao: (formData.get("descricao") as string) || null,
      coluna_id: (formData.get("coluna_id") as string) || null,
      setor_id: (formData.get("setor_id") as string) || null,
      origem: "MANUAL",
      prioridade: (formData.get("prioridade") as string) || "MEDIA",
      data_limite: (formData.get("data_limite") as string) || null,
      status: "SEM_DONO",
      criado_por: uid,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  if (data?.id && uid) {
    await admin.from("tarefa_historico").insert({
      tarefa_id: data.id,
      usuario_id: uid,
      acao: "CRIADA",
      dados: { titulo },
    });
  }

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true, id: data?.id };
}

export async function editarTarefa(id: string, campos: Record<string, any>) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin.from("tarefas").update(campos).eq("id", id);
  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: id,
    usuario_id: uid,
    acao: "EDITADA",
    dados: campos,
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function moverCard(
  tarefaId: string,
  colunaDestinoId: string,
  novaOrdem: number
) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data: tarefa } = await admin
    .from("tarefas")
    .select("coluna_id")
    .eq("id", tarefaId)
    .single();

  const colunaOrigemId = tarefa?.coluna_id ?? null;

  const { data: colDestino } = await admin
    .from("colunas_kanban")
    .select("nome")
    .eq("id", colunaDestinoId)
    .single();

  const nomeDestino = (colDestino?.nome ?? "").toLowerCase();
  const autoConclui =
    nomeDestino.includes("conclu") || nomeDestino === "done";

  const updateFields: Record<string, any> = {
    coluna_id: colunaDestinoId,
    ordem: novaOrdem,
  };

  if (autoConclui) {
    updateFields.status = "CONCLUIDA";
    updateFields.concluida_em = new Date().toISOString();
  }

  const { error } = await admin
    .from("tarefas")
    .update(updateFields)
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await Promise.all([
    admin.from("tarefa_movimentacoes").insert({
      tarefa_id: tarefaId,
      usuario_id: uid,
      coluna_origem_id: colunaOrigemId,
      coluna_destino_id: colunaDestinoId,
    }),
    admin.from("tarefa_historico").insert({
      tarefa_id: tarefaId,
      usuario_id: uid,
      acao: "MOVIDA",
      dados: {
        coluna_origem_id: colunaOrigemId,
        coluna_destino_id: colunaDestinoId,
        nova_ordem: novaOrdem,
      },
    }),
  ]);

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function aceitarTarefa(tarefaId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin
    .from("tarefas")
    .update({ status: "ACEITA", aceita_em: new Date().toISOString() })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "ACEITA",
    dados: null,
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function atribuirTarefa(tarefaId: string, novoUsuarioId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin
    .from("tarefas")
    .update({ usuario_responsavel_id: novoUsuarioId })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "ATRIBUIDA",
    dados: { usuario_responsavel_id: novoUsuarioId },
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function concluirTarefa(tarefaId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin
    .from("tarefas")
    .update({ status: "CONCLUIDA", concluida_em: new Date().toISOString() })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "CONCLUIDA",
    dados: null,
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function cancelarTarefa(tarefaId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin
    .from("tarefas")
    .update({ status: "CANCELADA" })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "CANCELADA",
    dados: null,
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function adicionarComentario(tarefaId: string, texto: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin.from("tarefa_comentarios").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    texto: texto.trim(),
  });

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "COMENTARIO_ADICIONADO",
    dados: null,
  });

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function adicionarLink(
  tarefaId: string,
  titulo: string,
  url: string
) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin.from("tarefa_links").insert({
    tarefa_id: tarefaId,
    titulo: titulo.trim(),
    url: url.trim(),
  });

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "LINK_ADICIONADO",
    dados: { titulo, url },
  });

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function removerLink(linkId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data: link } = await admin
    .from("tarefa_links")
    .select("tarefa_id, titulo")
    .eq("id", linkId)
    .single();

  const { error } = await admin
    .from("tarefa_links")
    .delete()
    .eq("id", linkId);

  if (error) return { ok: false, erro: error.message };

  if (link?.tarefa_id) {
    await admin.from("tarefa_historico").insert({
      tarefa_id: link.tarefa_id,
      usuario_id: uid,
      acao: "LINK_REMOVIDO",
      dados: { titulo: link.titulo },
    });
  }

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function uploadArquivo(tarefaId: string, formData: FormData) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, erro: "Arquivo inválido" };

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${tarefaId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("tarefas")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false, erro: uploadError.message };

  const { data: publicData } = admin.storage.from("tarefas").getPublicUrl(path);

  const { error: dbError } = await admin.from("tarefa_arquivos").insert({
    tarefa_id: tarefaId,
    nome: file.name,
    url: publicData.publicUrl,
    tipo: file.type || null,
    criado_por: uid,
  });

  if (dbError) return { ok: false, erro: dbError.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "ARQUIVO_ADICIONADO",
    dados: { nome: file.name },
  });

  revalidatePath("/tarefas");
  return { ok: true, url: publicData.publicUrl };
}

export async function removerArquivo(arquivoId: string, url: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data: arq } = await admin
    .from("tarefa_arquivos")
    .select("tarefa_id, nome")
    .eq("id", arquivoId)
    .single();

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/tarefas/");
    if (pathParts.length > 1) {
      await admin.storage.from("tarefas").remove([pathParts[1]]);
    }
  } catch {}

  const { error } = await admin
    .from("tarefa_arquivos")
    .delete()
    .eq("id", arquivoId);

  if (error) return { ok: false, erro: error.message };

  if (arq?.tarefa_id) {
    await admin.from("tarefa_historico").insert({
      tarefa_id: arq.tarefa_id,
      usuario_id: uid,
      acao: "ARQUIVO_REMOVIDO",
      dados: { nome: arq.nome },
    });
  }

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function adicionarChecklistItem(tarefaId: string, texto: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data: existentes } = await admin
    .from("tarefa_checklist")
    .select("ordem")
    .eq("tarefa_id", tarefaId)
    .order("ordem", { ascending: false })
    .limit(1);

  const novaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;

  const { error } = await admin.from("tarefa_checklist").insert({
    tarefa_id: tarefaId,
    texto: texto.trim(),
    concluido: false,
    ordem: novaOrdem,
  });

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "CHECKLIST_ITEM_ADICIONADO",
    dados: { texto },
  });

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function toggleChecklistItem(itemId: string, concluido: boolean) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("tarefa_checklist")
    .update({ concluido })
    .eq("id", itemId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function reordenarChecklistItem(
  itemId: string,
  novaOrdem: number
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("tarefa_checklist")
    .update({ ordem: novaOrdem })
    .eq("id", itemId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function removerChecklistItem(itemId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data: item } = await admin
    .from("tarefa_checklist")
    .select("tarefa_id, texto")
    .eq("id", itemId)
    .single();

  const { error } = await admin
    .from("tarefa_checklist")
    .delete()
    .eq("id", itemId);

  if (error) return { ok: false, erro: error.message };

  if (item?.tarefa_id) {
    await admin.from("tarefa_historico").insert({
      tarefa_id: item.tarefa_id,
      usuario_id: uid,
      acao: "CHECKLIST_ITEM_REMOVIDO",
      dados: { texto: item.texto },
    });
  }

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function criarColuna(
  nome: string,
  setor_id: string | null,
  usuario_id: string | null,
  cor?: string
) {
  const admin = createAdminClient();

  const filterKey = setor_id ? "setor_id" : "usuario_id";
  const filterVal = setor_id ?? usuario_id;

  const { data: existentes } = await admin
    .from("colunas_kanban")
    .select("ordem")
    .eq(filterKey, filterVal!)
    .order("ordem", { ascending: false })
    .limit(1);

  const novaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;

  const { data, error } = await admin
    .from("colunas_kanban")
    .insert({
      nome: nome.trim(),
      setor_id,
      usuario_id,
      cor: cor ?? null,
      tipo: "CUSTOM",
      ordem: novaOrdem,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true, id: data?.id };
}

export async function excluirColuna(colunaId: string) {
  const admin = createAdminClient();

  const { data: tarefas } = await admin
    .from("tarefas")
    .select("id")
    .eq("coluna_id", colunaId)
    .is("deleted_at", null)
    .limit(1);

  if (tarefas && tarefas.length > 0) {
    return { ok: false, erro: "Coluna contém tarefas e não pode ser excluída" };
  }

  const { error } = await admin
    .from("colunas_kanban")
    .delete()
    .eq("id", colunaId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function criarEtiqueta(
  nome: string,
  cor: string,
  setor_id: string | null
) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { data, error } = await admin
    .from("etiquetas")
    .insert({ nome: nome.trim(), cor, setor_id, criado_por: uid })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  return { ok: true, id: data?.id };
}

export async function vincularEtiqueta(tarefaId: string, etiquetaId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("tarefa_etiquetas")
    .upsert({ tarefa_id: tarefaId, etiqueta_id: etiquetaId });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function desvincularEtiqueta(
  tarefaId: string,
  etiquetaId: string
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("tarefa_etiquetas")
    .delete()
    .eq("tarefa_id", tarefaId)
    .eq("etiqueta_id", etiquetaId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function vincularObra(tarefaId: string, obraId: string) {
  const admin = createAdminClient();
  const uid = await usuarioAtualId();

  const { error } = await admin
    .from("tarefas")
    .update({ obra_id: obraId })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefaId,
    usuario_id: uid,
    acao: "OBRA_VINCULADA",
    dados: { obra_id: obraId },
  });

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { ok: true };
}

export async function buscarUsuarios() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("usuarios")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  return (data ?? []) as { id: string; nome: string }[];
}

export async function buscarDetalhesTarefa(tarefaId: string) {
  const admin = createAdminClient();

  const [tarefaRes, comentariosRes, checklistRes, linksRes, arquivosRes, historicoRes] =
    await Promise.all([
      admin
        .from("tarefas")
        .select(
          `*, responsavel:usuarios!usuario_responsavel_id(id, nome),
           etiquetas:tarefa_etiquetas(etiqueta:etiquetas(id, nome, cor, setor_id))`
        )
        .eq("id", tarefaId)
        .single(),
      admin
        .from("tarefa_comentarios")
        .select("*, usuario:usuarios(nome)")
        .eq("tarefa_id", tarefaId)
        .order("criado_em"),
      admin
        .from("tarefa_checklist")
        .select("*")
        .eq("tarefa_id", tarefaId)
        .order("ordem"),
      admin
        .from("tarefa_links")
        .select("*")
        .eq("tarefa_id", tarefaId)
        .order("criado_em"),
      admin
        .from("tarefa_arquivos")
        .select("*")
        .eq("tarefa_id", tarefaId)
        .order("criado_em"),
      admin
        .from("tarefa_historico")
        .select("*, usuario:usuarios(nome)")
        .eq("tarefa_id", tarefaId)
        .order("criado_em"),
    ]);

  if (!tarefaRes.data) return null;

  const rawTarefa = tarefaRes.data as any;
  const etiquetas = (rawTarefa.etiquetas ?? [])
    .map((te: any) => te.etiqueta)
    .filter(Boolean);

  return {
    tarefa: { ...rawTarefa, etiquetas },
    comentarios: comentariosRes.data ?? [],
    checklist: checklistRes.data ?? [],
    links: linksRes.data ?? [],
    arquivos: arquivosRes.data ?? [],
    historico: historicoRes.data ?? [],
  };
}

export async function sincronizarTarefasCompras(): Promise<{ criadas: number; corrigidas: number; erros: number }> {
  const admin = createAdminClient();

  const { data: setorCompras } = await admin
    .from("setores")
    .select("id")
    .ilike("nome", "%compra%")
    .limit(1)
    .maybeSingle();

  if (!setorCompras?.id) return { criadas: 0, corrigidas: 0, erros: 0 };
  const setorId = setorCompras.id;

  // Coluna "Sem dono" do setor de Compras
  const colunasMap = await garantirColunasCompras(setorId);

  const STATUS_ATIVOS = ["RASCUNHO", "AGUARDANDO_APROVACAO", "APROVADO", "AGUARDANDO_RECEBIMENTO", "RECEBIMENTO_PARCIAL"];

  const { data: pedidos } = await admin
    .from("pedidos_compra")
    .select("id, numero, status, obra_id, comprador_id")
    .in("status", STATUS_ATIVOS);

  // Tarefas abertas vinculadas a pedidos
  const { data: tarefasExistentes } = await admin
    .from("tarefas")
    .select("id, entidade_ref_id, setor_id, coluna_id")
    .eq("entidade_ref", "pedido")
    .is("deleted_at", null)
    .not("status", "in", '("CONCLUIDA","CANCELADA")');

  const tarefasMap = new Map(
    (tarefasExistentes ?? []).map((t: any) => [t.entidade_ref_id, t])
  );

  let criadas = 0;
  let corrigidas = 0;
  let erros = 0;

  for (const ped of pedidos ?? []) {
    const tarefaExistente = tarefasMap.get(ped.id);

    const colunaCorreta = STATUS_COLUNA[ped.status as keyof typeof STATUS_COLUNA];
    const colunaId = colunaCorreta ? colunasMap[colunaCorreta] ?? null : null;

    if (tarefaExistente) {
      // Corrige setor errado ou coluna errada
      const precisaCorrigir = tarefaExistente.setor_id !== setorId || (colunaId && tarefaExistente.coluna_id !== colunaId);
      if (precisaCorrigir) {
        const { error } = await admin
          .from("tarefas")
          .update({ setor_id: setorId, ...(colunaId ? { coluna_id: colunaId } : {}) })
          .eq("id", tarefaExistente.id);
        if (!error) corrigidas++;
        else erros++;
      }
      continue;
    }

    // Tarefa não existe — cria
    const prioridade = ped.status === "AGUARDANDO_APROVACAO" ? "ALTA" : "MEDIA";
    const titulo = `Pedido ${ped.numero} — ${STATUS_LABEL[ped.status as keyof typeof STATUS_LABEL] ?? ped.status}`;

    const result = await criarTarefaAutomatica({
      titulo,
      setor_id: setorId,
      origem: "COMPRA",
      entidade_ref: "pedido",
      entidade_ref_id: ped.id,
      pedido_id: ped.id,
      obra_id: (ped as any).obra_id ?? undefined,
      prioridade,
      criado_por: ped.comprador_id ?? undefined,
      coluna_id: colunaId ?? undefined,
    });

    if (result) criadas++;
    else erros++;
  }

  revalidatePath("/tarefas");
  revalidatePath("/");
  return { criadas, corrigidas, erros };
}

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:               "rascunho",
  AGUARDANDO_APROVACAO:   "aguardando aprovação",
  APROVADO:               "aprovado",
  AGUARDANDO_RECEBIMENTO: "aguardando recebimento",
  RECEBIMENTO_PARCIAL:    "recebimento parcial",
};

const STATUS_COLUNA: Record<string, string> = {
  RASCUNHO:               "Rascunho",
  AGUARDANDO_APROVACAO:   "Aguard. Aprovação",
  APROVADO:               "Aprovados",
  AGUARDANDO_RECEBIMENTO: "Em Recebimento",
  RECEBIMENTO_PARCIAL:    "Em Recebimento",
};
