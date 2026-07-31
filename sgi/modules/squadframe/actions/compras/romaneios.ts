"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { getUsuarioId } from "./helpers";
import { extrairDadosRomaneioPdf } from "@/modules/squadframe/lib/extrair-romaneio-pdf";

// Status elegíveis pra um pedido aparecer como candidato num romaneio —
// qualquer coisa a partir de EMITIDO (já foi mandado pro fornecedor),
// incluindo RECEBIDO/FINALIZADO: o romaneio pode chegar/ser cadastrado
// depois do recebimento já ter sido conferido manualmente (cadastro
// retroativo), não só enquanto o pedido ainda está "a caminho".
const STATUS_ELEGIVEL_ROMANEIO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];

export type PedidoCandidatoRomaneio = {
  id: string;
  numero: string;
  obra: string | null;
  fornecedor: string | null;
};

export type ResultadoProcessamentoRomaneio = {
  numero: string | null;
  data_entrega: string | null;
  fornecedor: { id: string; nome: string } | null;
  pedidosCandidatos: PedidoCandidatoRomaneio[];
  arquivoNome: string;
  arquivoCaminho: string;
  // Diagnóstico pra quando o matching falhar — texto bruto extraído do PDF
  // e os tokens numéricos que ele gerou, pra dar pra ver o que o pdf-parse
  // realmente leu (ex: PDF escaneado/imagem não tem camada de texto e
  // extrai vazio, o que não fica óbvio só olhando "não achou nada").
  texto: string;
  tokensNumericos: string[];
};

// Sobe o PDF, extrai os candidatos (número, data, fornecedor, pedidos) e
// devolve tudo pro cliente revisar — nada é gravado no banco ainda (mesmo
// espírito de sempre exigir confirmação visual antes de persistir extração
// de PDF/XML neste projeto).
export async function processarRomaneioAction(formData: FormData): Promise<ResultadoProcessamentoRomaneio> {
  await verificarPermissao(PERMISSIONS.COMPRAS_ROMANEIO_CRIAR);

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) throw new Error("Selecione um arquivo PDF.");

  const admin = createAdminClient();
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const safe = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `romaneios/${Date.now()}-${safe}`;
  const { error: erroUpload } = await admin.storage.from("pedido-docs").upload(caminho, buffer, {
    contentType: "application/pdf",
  });
  if (erroUpload) throw new Error(erroUpload.message);

  const { numeroCandidato, dataCandidata, tokensNumericos, texto } = await extrairDadosRomaneioPdf(buffer);

  const { data: pedidosElegiveis } = await admin
    .from("pedidos_compra")
    .select("id, numero, obra:obras(nome), fornecedor:fornecedores(nome)")
    .in("status", STATUS_ELEGIVEL_ROMANEIO);

  const pedidosCandidatos: PedidoCandidatoRomaneio[] = (pedidosElegiveis ?? [])
    .filter((p) => tokensNumericos.includes(p.numero))
    .map((p) => {
      const obra = Array.isArray(p.obra) ? p.obra[0] : p.obra;
      const fornecedor = Array.isArray(p.fornecedor) ? p.fornecedor[0] : p.fornecedor;
      return {
        id: p.id,
        numero: p.numero,
        obra: obra?.nome ?? null,
        fornecedor: fornecedor?.nome ?? null,
      };
    });

  // Casa fornecedor por substring simples (case-insensitive) do nome/razão
  // social no texto extraído — não existe lib de fuzzy match no projeto,
  // sempre com confirmação visual depois.
  const { data: fornecedores } = await admin.from("fornecedores").select("id, nome, razao_social");
  const textoNorm = texto.toLowerCase();
  const fornecedorMatch = (fornecedores ?? []).find((f) => {
    const nome = f.nome?.toLowerCase();
    const razao = f.razao_social?.toLowerCase();
    return (nome && nome.length > 3 && textoNorm.includes(nome)) ||
      (razao && razao.length > 3 && textoNorm.includes(razao));
  });

  return {
    numero: numeroCandidato,
    data_entrega: dataCandidata,
    fornecedor: fornecedorMatch ? { id: fornecedorMatch.id, nome: fornecedorMatch.nome } : null,
    pedidosCandidatos,
    arquivoNome: arquivo.name,
    arquivoCaminho: caminho,
    texto,
    tokensNumericos,
  };
}

export type DadosConfirmacaoRomaneio = {
  numero: string | null;
  data_entrega: string | null;
  fornecedor_id: string | null;
  pedidoIds: string[];
  arquivoNome: string;
  arquivoCaminho: string;
};

// Persiste o romaneio já revisado/editado pelo usuário: cria o romaneio,
// vincula os pedidos marcados e anexa o mesmo arquivo como documento de
// cada pedido vinculado (pedido_documentos já existente, só ganha
// romaneio_id pra rastreio).
export async function confirmarRomaneioAction(dados: DadosConfirmacaoRomaneio) {
  await verificarPermissao(PERMISSIONS.COMPRAS_ROMANEIO_CRIAR);
  if (!dados.pedidoIds.length) throw new Error("Selecione ao menos um pedido vinculado ao romaneio.");

  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const { data: romaneio, error } = await admin
    .from("romaneios")
    .insert({
      numero: dados.numero,
      data_entrega: dados.data_entrega,
      fornecedor_id: dados.fornecedor_id,
      arquivo_nome: dados.arquivoNome,
      arquivo_caminho: dados.arquivoCaminho,
      criado_por: usuarioId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: erroVinculo } = await admin
    .from("romaneio_pedidos")
    .insert(dados.pedidoIds.map((pedido_id) => ({ romaneio_id: romaneio.id, pedido_id })));
  if (erroVinculo) throw new Error(erroVinculo.message);

  const { error: erroDocs } = await admin.from("pedido_documentos").insert(
    dados.pedidoIds.map((pedido_id) => ({
      pedido_id,
      usuario_id: usuarioId,
      nome_arquivo: dados.arquivoNome,
      caminho_storage: dados.arquivoCaminho,
      romaneio_id: romaneio.id,
    })),
  );
  if (erroDocs) throw new Error(erroDocs.message);

  revalidatePath("/squadframe/compras/entregas");
  for (const pedidoId of dados.pedidoIds) {
    revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
  }

  redirect(`/squadframe/compras/entregas/${romaneio.id}`);
}
