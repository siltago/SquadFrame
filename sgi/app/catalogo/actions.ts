"use server";

import { createAdminClient as createClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Abas (tipos de linha) ───────────────────────────────────

export async function criarAba(formData: FormData) {
  const supabase = createClient();
  const nome    = String(formData.get("nome")    || "").trim();
  const unidade = String(formData.get("unidade") || "UN").trim();
  if (!nome) throw new Error("Nome é obrigatório.");

  const slug = nome
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { error } = await supabase.from("tipos_linha").insert({ nome, slug, unidade });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma aba com esse nome.");
    throw new Error(error.message);
  }

  revalidatePath("/catalogo");
}

export async function editarAba(id: string, formData: FormData) {
  const supabase = createClient();
  const nome    = String(formData.get("nome")    || "").trim();
  const unidade = String(formData.get("unidade") || "UN").trim();
  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase
    .from("tipos_linha")
    .update({ nome, unidade })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
}

export async function apagarAba(id: string) {
  const supabase = createClient();

  const { count } = await supabase
    .from("linhas")
    .select("id", { count: "exact", head: true })
    .eq("tipo", (await supabase.from("tipos_linha").select("slug").eq("id", id).single()).data?.slug ?? "");

  if ((count ?? 0) > 0) {
    throw new Error(
      `Esta aba possui ${count} linha(s). Remova as linhas antes de apagar a aba.`
    );
  }

  const { error } = await supabase.from("tipos_linha").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
}

// ─── Linha ───────────────────────────────────────────────────

export async function criarLinha(formData: FormData) {
  const supabase = createClient();

  const nome = String(formData.get("nome") || "").trim();
  const fabricante = String(formData.get("fabricante") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const tipoRaw = String(formData.get("tipo") || "").trim();

  if (!nome) throw new Error("Nome da linha é obrigatório.");
  if (!tipoRaw) throw new Error("Selecione a aba do catálogo.");

  // Valida que o tipo existe como slug em tipos_linha (case-insensitive)
  const { data: tiposValidos } = await supabase.from("tipos_linha").select("slug");
  const slugMatch = tiposValidos?.find(
    (t) => t.slug.toUpperCase() === tipoRaw.toUpperCase()
  );
  if (!slugMatch) throw new Error("Tipo de aba inválido. Selecione uma aba válida.");
  const tipo = slugMatch.slug; // usa o slug exato do BD

  const { data, error } = await supabase
    .from("linhas")
    .insert({ nome, fabricante: fabricante || null, descricao: descricao || null, tipo })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
  redirect(`/catalogo/${data.id}`);
}

export async function editarLinha(linhaId: string, formData: FormData) {
  const supabase = createClient();
  const nome = String(formData.get("nome") || "").trim();
  const fabricante = String(formData.get("fabricante") || "").trim() || null;
  const descricao = String(formData.get("descricao") || "").trim() || null;
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await supabase
    .from("linhas")
    .update({ nome, fabricante, descricao })
    .eq("id", linhaId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${linhaId}`);
}

export async function apagarLinha(linhaId: string) {
  const supabase = createClient();

  const { count } = await supabase
    .from("produtos")
    .select("id", { count: "exact", head: true })
    .eq("linha_id", linhaId);

  if ((count ?? 0) > 0) {
    throw new Error(
      `Esta linha possui ${count} produto(s). Remova os produtos antes de apagar a linha.`
    );
  }

  const { error } = await supabase.from("linhas").delete().eq("id", linhaId);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
  redirect("/catalogo");
}

// ─── Categoria ───────────────────────────────────────────────

export async function criarCategoria(linhaId: string, formData: FormData) {
  const supabase = createClient();

  const nome = String(formData.get("nome") || "").trim().toUpperCase();
  const tipo = String(formData.get("tipo") || "OUTROS").trim().toUpperCase();

  if (!nome) throw new Error("Nome da categoria é obrigatório.");

  const { error } = await supabase
    .from("categorias_perfil")
    .insert({ linha_id: linhaId, nome, tipo });

  if (error) throw new Error(error.message);

  revalidatePath(`/catalogo/${linhaId}`);
}

export async function editarCategoria(categoriaId: string, linhaId: string, formData: FormData) {
  const supabase = createClient();
  const nome = String(formData.get("nome") || "").trim().toUpperCase();
  const tipo = String(formData.get("tipo") || "OUTROS").trim().toUpperCase();
  if (!nome) throw new Error("Nome da categoria é obrigatório.");
  const { error } = await supabase
    .from("categorias_perfil")
    .update({ nome, tipo })
    .eq("id", categoriaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}`);
  revalidatePath("/catalogo");
}

export async function apagarCategoria(categoriaId: string, linhaId: string) {
  const supabase = createClient();
  // Desvincula produtos antes de apagar
  await supabase.from("produtos").update({ categoria_id: null }).eq("categoria_id", categoriaId);
  const { error } = await supabase.from("categorias_perfil").delete().eq("id", categoriaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}`);
  revalidatePath("/catalogo");
}

// ─── Importação XML em massa ─────────────────────────────────

export async function importarPerfisXml(
  linhaId: string,
  itensJson: string,
) {
  const supabase = createClient();

  const itens: Array<{ codigo: string; peso: number }> = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Nenhum perfil para importar.");

  // Descobre quais já existem nesta linha
  const codigos = itens.map((i) => i.codigo);
  const { data: existentes } = await supabase
    .from("produtos")
    .select("codigo_mestre")
    .eq("linha_id", linhaId)
    .in("codigo_mestre", codigos);
  const existentesSet = new Set((existentes ?? []).map((e) => e.codigo_mestre));

  const novos = itens.filter((i) => !existentesSet.has(i.codigo));
  if (novos.length === 0) return { importados: 0, duplicatas: existentesSet.size };

  const { data: inseridos, error } = await supabase
    .from("produtos")
    .insert(
      novos.map((i) => ({
        codigo_mestre: i.codigo,
        nome:          i.codigo,
        nome_tecnico:  i.codigo,
        linha_id:      linhaId,
        unidade:       "BARRA",
        peso_metro:    i.peso,
        tamanho_mm:    6000,
      })),
    )
    .select("id");

  if (error) throw new Error(error.message);

  // Vincula automaticamente todas as cores RAL
  const { data: cores } = await supabase.from("cores_ral").select("id, acabamento_id");
  if (cores && cores.length > 0 && inseridos && inseridos.length > 0) {
    await supabase.from("produto_cores").insert(
      inseridos.flatMap((p) =>
        cores.map((c) => {
          const row: Record<string, string> = { produto_id: p.id, cor_id: c.id };
          if (c.acabamento_id) row.acabamento_id = c.acabamento_id;
          return row;
        }),
      ),
    );
  }

  revalidatePath(`/catalogo/${linhaId}`);
  return { importados: novos.length, duplicatas: existentesSet.size };
}

export async function atualizarUnidadeLinha(linhaId: string, de: string, para: string) {
  const supabase = createClient();
  // Conta antes
  const { count: antes } = await supabase
    .from("produtos")
    .select("id", { count: "exact", head: true })
    .eq("linha_id", linhaId)
    .eq("unidade", de);
  const { error } = await supabase
    .from("produtos")
    .update({ unidade: para })
    .eq("linha_id", linhaId)
    .eq("unidade", de);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}`);
  return { atualizados: antes ?? 0 };
}

export async function definirComprimentoLinha(linhaId: string, tamanho_mm: number) {
  const supabase = createClient();
  const { count: antes } = await supabase
    .from("produtos")
    .select("id", { count: "exact", head: true })
    .eq("linha_id", linhaId)
    .is("tamanho_mm", null);
  const { error } = await supabase
    .from("produtos")
    .update({ tamanho_mm })
    .eq("linha_id", linhaId)
    .is("tamanho_mm", null);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}`);
  return { atualizados: antes ?? 0 };
}

export async function atualizarPesosXml(
  linhaId: string,
  itensJson: string,
) {
  const supabase = createClient();
  const itens: Array<{ codigo: string; peso: number }> = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Nenhum item para atualizar.");

  const resultados = await Promise.all(
    itens.map((item) =>
      supabase
        .from("produtos")
        .update({ peso_metro: item.peso })
        .eq("linha_id", linhaId)
        .eq("codigo_mestre", item.codigo)
        .then(({ error }) => !error),
    ),
  );

  const atualizados = resultados.filter(Boolean).length;
  revalidatePath(`/catalogo/${linhaId}`);
  return { atualizados };
}

// ─── Produto ─────────────────────────────────────────────────

export async function criarProduto(linhaId: string, formData: FormData) {
  const supabase = createClient();

  const codigo_mestre  = String(formData.get("codigo_mestre")  || "").trim();
  const nome_tecnico   = String(formData.get("nome_tecnico")   || "").trim();
  const categoria_id   = String(formData.get("categoria_id")   || "").trim() || null;
  const unidade        = String(formData.get("unidade")        || "UN").trim();
  const descricao      = String(formData.get("descricao")      || "").trim() || null;
  const observacoes    = String(formData.get("observacoes")    || "").trim() || null;
  const peso_metro     = parseFloat(String(formData.get("peso_metro")  || "").replace(",", ".")) || null;
  const preco_metro    = parseFloat(String(formData.get("preco_metro") || "").replace(",", ".")) || null;
  const tamanho_mm     = parseFloat(String(formData.get("tamanho_mm")  || "").replace(",", ".")) || null;

  if (!codigo_mestre) throw new Error("Código mestre é obrigatório.");
  if (!nome_tecnico) throw new Error("Nome técnico é obrigatório.");

  const { data: existente } = await supabase
    .from("produtos")
    .select("id, linha_id")
    .eq("codigo_mestre", codigo_mestre)
    .maybeSingle();

  if (existente) redirect(`/catalogo/${existente.linha_id}/${existente.id}`);

  const { data, error } = await supabase
    .from("produtos")
    .insert({
      codigo_mestre,
      nome: nome_tecnico,
      nome_tecnico,
      linha_id: linhaId,
      categoria_id,
      unidade,
      descricao,
      observacoes,
      peso_metro,
      preco_metro,
      tamanho_mm,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Vincula automaticamente todas as cores RAL existentes ao novo produto
  const { data: cores } = await supabase.from("cores_ral").select("id, acabamento_id");
  if (cores && cores.length > 0) {
    await supabase.from("produto_cores").insert(
      cores.map((c) => {
        const row: Record<string, string> = { produto_id: data.id, cor_id: c.id };
        if (c.acabamento_id) row.acabamento_id = c.acabamento_id;
        return row;
      })
    );
  }

  revalidatePath(`/catalogo/${linhaId}`);
  redirect(`/catalogo/${linhaId}/${data.id}`);
}

// ─── Cores ───────────────────────────────────────────────────

export async function vincularTodasCores(produtoId: string, linhaId: string) {
  const supabase = createClient();

  const [{ data: todasCores }, { data: jaVinculadas }] = await Promise.all([
    supabase.from("cores_ral").select("id, acabamento_id"),
    supabase
      .from("produto_cores")
      .select("cor_id")
      .eq("produto_id", produtoId),
  ]);

  if (!todasCores || todasCores.length === 0) return;

  const vinculadasIds = new Set((jaVinculadas ?? []).map((r) => r.cor_id));
  const novas = todasCores.filter((c) => !vinculadasIds.has(c.id));

  if (novas.length === 0) return;

  const { error } = await supabase.from("produto_cores").insert(
    novas.map((c) => {
      const row: Record<string, string> = { produto_id: produtoId, cor_id: c.id };
      if (c.acabamento_id) row.acabamento_id = c.acabamento_id;
      return row;
    })
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

export async function vincularCor(
  produtoId: string,
  linhaId: string,
  corId: string,
  acabamentoId: string | null
) {
  const supabase = createClient();

  if (!corId) throw new Error("Selecione uma cor.");

  const insertData: Record<string, string> = { produto_id: produtoId, cor_id: corId };
  if (acabamentoId) insertData.acabamento_id = acabamentoId;

  const { error } = await supabase.from("produto_cores").insert(insertData);

  if (error) {
    if (error.code === "23505") throw new Error("Esta cor já está vinculada a este produto.");
    throw new Error(error.message);
  }

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

// ─── Produto (editar) ────────────────────────────────────────

export async function editarProduto(
  produtoId: string,
  linhaId: string,
  formData: FormData
): Promise<{ redirect?: string }> {
  const supabase = createClient();
  const nome = String(formData.get("nome") || "").trim();
  const codigo_mestre = String(formData.get("codigo_mestre") || "").trim();
  const unidade = String(formData.get("unidade") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const observacoes = String(formData.get("observacoes") || "").trim() || null;
  const status = formData.get("status") === "true";
  const fornecedor_mestre_id = String(formData.get("fornecedor_mestre_id") || "").trim() || null;
  const novaLinhaId = String(formData.get("linha_id") || "").trim() || linhaId;
  const categoria_id = String(formData.get("categoria_id") || "").trim() || null;

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!codigo_mestre) throw new Error("Código mestre é obrigatório.");
  if (!unidade) throw new Error("Unidade é obrigatória.");

  const peso_metro  = parseFloat(String(formData.get("peso_metro")  || "").replace(",", ".")) || null;
  const preco_metro = parseFloat(String(formData.get("preco_metro") || "").replace(",", ".")) || null;
  const tamanho_mm  = parseFloat(String(formData.get("tamanho_mm")  || "").replace(",", ".")) || null;

  const { error } = await supabase.from("produtos").update({
    nome, nome_tecnico: nome, codigo_mestre, unidade, descricao, observacoes, status,
    fornecedor_mestre_id, linha_id: novaLinhaId, categoria_id,
    peso_metro, preco_metro, tamanho_mm,
  }).eq("id", produtoId);

  if (error) throw new Error(error.message);

  if (novaLinhaId !== linhaId) {
    revalidatePath(`/catalogo/${novaLinhaId}/${produtoId}`);
    return { redirect: `/catalogo/${novaLinhaId}/${produtoId}` };
  }

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
  return {};
}

// ─── Aliases ─────────────────────────────────────────────────

export async function adicionarAlias(
  produtoId: string,
  linhaId: string,
  alias: string,
  fornecedorId?: string | null,
  specs?: { peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null }
) {
  const supabase = createClient();

  const valor = alias.trim();
  if (!valor) throw new Error("Alias não pode ser vazio.");

  const row: Record<string, unknown> = { produto_id: produtoId, alias: valor };
  if (fornecedorId) row.fornecedor_id = fornecedorId;
  if (specs?.peso_metro != null)  row.peso_metro  = specs.peso_metro;
  if (specs?.preco_metro != null) row.preco_metro = specs.preco_metro;
  if (specs?.tamanho_mm != null)  row.tamanho_mm  = specs.tamanho_mm;

  const { error } = await supabase.from("produto_aliases").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

export async function editarAlias(
  aliasId: string,
  produtoId: string,
  linhaId: string,
  alias: string,
  fornecedorId?: string | null,
  specs?: { peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null }
) {
  const supabase = createClient();
  const valor = alias.trim();
  if (!valor) throw new Error("Alias não pode ser vazio.");
  const row: Record<string, unknown> = {
    alias: valor,
    fornecedor_id: fornecedorId || null,
    peso_metro:  specs?.peso_metro  ?? null,
    preco_metro: specs?.preco_metro ?? null,
    tamanho_mm:  specs?.tamanho_mm  ?? null,
  };
  const { error } = await supabase.from("produto_aliases").update(row).eq("id", aliasId);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

export async function excluirAlias(aliasId: string, produtoId: string, linhaId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("produto_aliases").delete().eq("id", aliasId);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

// ─── Fornecedores ────────────────────────────────────────────

export async function adicionarFornecedor(
  produtoId: string,
  linhaId: string,
  formData: FormData
) {
  const supabase = createClient();

  const fornecedorNome = String(formData.get("fornecedor_nome") || "").trim();
  const codigoFornecedor = String(formData.get("codigo_fornecedor") || "").trim();
  const precoStr = String(formData.get("preco_referencia") || "").trim();
  const precoReferencia = precoStr ? parseFloat(precoStr.replace(",", ".")) : null;

  if (!fornecedorNome) throw new Error("Nome do fornecedor é obrigatório.");

  // Encontra ou cria o fornecedor pelo nome
  let fornecedorId: string;
  const { data: existente } = await supabase
    .from("fornecedores")
    .select("id")
    .ilike("nome", fornecedorNome)
    .maybeSingle();

  if (existente) {
    fornecedorId = existente.id;
  } else {
    const { data: novo, error: errForn } = await supabase
      .from("fornecedores")
      .insert({ nome: fornecedorNome })
      .select("id")
      .single();
    if (errForn) throw new Error(errForn.message);
    fornecedorId = novo.id;
  }

  const { error } = await supabase.from("produto_fornecedores").insert({
    produto_id: produtoId,
    fornecedor_id: fornecedorId,
    codigo_fornecedor: codigoFornecedor || null,
    preco_referencia: precoReferencia && !isNaN(precoReferencia) ? precoReferencia : null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

// ─── Excluir Arquivo ─────────────────────────────────────────

export async function deletarArquivo(
  produtoId: string,
  linhaId: string,
  arquivoId: string,
  url: string,
  urlPreview: string | null
) {
  const supabase = createClient();

  const extractPath = (publicUrl: string) => {
    const marker = "/object/public/catalogo/";
    const idx = publicUrl.indexOf(marker);
    return idx !== -1 ? decodeURIComponent(publicUrl.slice(idx + marker.length)) : null;
  };

  const { error } = await supabase
    .from("produto_arquivos")
    .delete()
    .eq("id", arquivoId);

  if (error) throw new Error(error.message);

  const paths = [url, urlPreview]
    .filter(Boolean)
    .map((u) => extractPath(u!))
    .filter(Boolean) as string[];

  if (paths.length > 0) {
    await supabase.storage.from("catalogo").remove(paths);
  }

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}

// ─── Excluir Produto ─────────────────────────────────────────

export async function deletarProduto(linhaId: string, produtoId: string) {
  const supabase = createClient();

  // Remove itens de solicitação vinculados a este produto
  const { error: errSol } = await supabase
    .from("solicitacao_itens")
    .delete()
    .eq("produto_id", produtoId);
  if (errSol) throw new Error(`Erro ao desvincular solicitações: ${errSol.message}`);

  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", produtoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/catalogo/${linhaId}`);
  redirect(`/catalogo/${linhaId}`);
}

// ─── Cores RAL (cadastro / exclusão) ────────────────────────

export async function deletarCor(corId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("cores_ral").delete().eq("id", corId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogo");
}

export async function criarCorRal(formData: FormData) {
  const supabase = createClient();
  const codigo_ral = String(formData.get("codigo_ral") || "").trim().toUpperCase();
  const nome = String(formData.get("nome") || "").trim() || null;
  const hex = String(formData.get("hex") || "").trim() || null;
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);

  if (!codigo_ral) throw new Error("Código RAL é obrigatório.");

  const { error } = await supabase.from("cores_ral").insert({ codigo_ral, nome, hex, tipos });
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
}

export async function editarCor(id: string, formData: FormData) {
  const supabase = createClient();
  const nome = String(formData.get("nome") || "").trim() || null;
  const hex = String(formData.get("hex") || "").trim() || null;
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);

  const { error } = await supabase.from("cores_ral").update({ nome, hex, tipos }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
}

// ─── Arquivos ────────────────────────────────────────────────

const TIPOS_PERMITIDOS: Record<string, string> = {
  dxf: "dxf",
  png: "imagem",
  jpg: "imagem",
  jpeg: "imagem",
  webp: "imagem",
  pdf: "pdf",
};

async function dxfParaPng(dxfText: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseString, toPolylines } = require("dxf") as {
    parseString: (s: string) => unknown;
    toPolylines: (p: unknown) => {
      bbox: { min: { x: number; y: number }; max: { x: number; y: number }; valid: boolean };
      polylines: Array<{ vertices: [number, number][] }>;
    };
  };
  const sharp = (await import("sharp")).default;

  const parsed = parseString(dxfText);
  const { bbox, polylines } = toPolylines(parsed);

  if (!bbox.valid || polylines.length === 0) {
    throw new Error("DXF sem geometria válida");
  }

  const minX = bbox.min.x;
  const minY = bbox.min.y;
  const w = bbox.max.x - bbox.min.x;
  const h = bbox.max.y - bbox.min.y;
  // Stroke proporcional ao menor lado, mínimo de 0.5 unidades de desenho
  const strokeW = Math.max(Math.min(w, h) * 0.008, 0.5);
  // Margem ao redor do conteúdo: garante que o traço das bordas não seja cortado
  const pad = strokeW * 2;
  const vbX = -pad;
  const vbY = -pad;
  const vbW = w + pad * 2;
  const vbH = h + pad * 2;

  // toPolylines converte tudo (splines, arcos, polilinhas) em vértices interpolados.
  // Usamos <polygon> que é sempre fechado e preenchido — ideal para seções de perfil.
  const polygons = polylines
    .filter(({ vertices }) => vertices.length >= 2)
    .map(({ vertices }) => {
      // DXF: Y cresce para cima; SVG: Y cresce para baixo — inverte Y
      const pts = vertices
        .map(([x, y]) => `${x - minX},${h - (y - minY)}`)
        .join(' ');
      return `<polygon points="${pts}" fill="#bfdbfe" fill-opacity="0.55" stroke="#1e293b" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
    })
    .join('\n  ');

  const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">
  ${polygons}
</svg>`;

  return sharp(Buffer.from(svg))
    .resize(600, 600, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}

export async function enviarArquivo(
  produtoId: string,
  linhaId: string,
  formData: FormData
) {
  const supabase = createClient();

  const file = formData.get("arquivo") as File;
  if (!file || !file.name || file.size === 0) {
    throw new Error("Selecione um arquivo.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPOS_PERMITIDOS[ext];
  if (!tipo) {
    throw new Error("Formato não suportado. Use DXF, PNG, JPG, WEBP ou PDF.");
  }

  const ts = Date.now();
  const nomeSanitizado = file.name.replace(/\s+/g, "_");
  const caminho = `${produtoId}/${ts}-${nomeSanitizado}`;

  const { error: uploadError } = await supabase.storage
    .from("catalogo")
    .upload(caminho, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage
    .from("catalogo")
    .getPublicUrl(caminho);

  // Gera preview
  let urlPreview: string | null = null;

  if (tipo === "imagem") {
    urlPreview = publicUrl;
  } else if (tipo === "dxf") {
    try {
      const dxfText = await file.text();
      const pngBuffer = await dxfParaPng(dxfText);
      const previewPath = `${produtoId}/preview-${ts}.png`;
      const { error: prevErr } = await supabase.storage
        .from("catalogo")
        .upload(previewPath, pngBuffer, { contentType: "image/png" });
      if (!prevErr) {
        const { data: { publicUrl: previewUrl } } = supabase.storage
          .from("catalogo")
          .getPublicUrl(previewPath);
        urlPreview = previewUrl;
      }
    } catch {
      // Conversão falhou — continua sem preview
    }
  }

  const { error } = await supabase.from("produto_arquivos").insert({
    produto_id: produtoId,
    nome_original: file.name,
    url: publicUrl,
    url_preview: urlPreview,
    tipo,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/catalogo/${linhaId}/${produtoId}`);
}
