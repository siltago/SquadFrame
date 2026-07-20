"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import * as service from "./service";
import type {
  WisePacoteCompras, WiseNecessidade, ResultadoServico,
  CoberturaNecessidade, PedidoItemDisponivel, StatusSuprimentosCalculado,
  SolicitacaoItemDisponivel, RecebimentoItemDisponivel,
  ItemXmlParaResolver, ResolucaoImportacaoXml, DecisaoItemXml,
} from "./types";

async function usuarioAtualId(): Promise<string | null> {
  const u = await getUsuarioAtual();
  return u?.id ?? null;
}

export async function obterContextoAction(pacoteId: string): Promise<WisePacoteCompras | null> {
  return service.obterContexto(pacoteId);
}

export async function listarNecessidadesAction(pacoteId: string): Promise<WiseNecessidade[]> {
  return service.listarNecessidades(pacoteId);
}

export async function ensureContextoAction(pacoteId: string): Promise<ResultadoServico<string>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  return service.ensureContexto(pacoteId, usuarioId);
}

export async function adicionarNecessidadeAction(dados: {
  pacote_id: string;
  produto_id?: string | null;
  descricao_livre?: string | null;
  quantidade: number;
  unidade: string;
  criticidade?: string;
  etapa_necessaria?: string | null;
}): Promise<ResultadoServico<string>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.adicionarNecessidade({ ...dados, usuario_id: usuarioId });
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function resolverCodigosImportadosAction(
  itens: ItemXmlParaResolver[],
): Promise<ResolucaoImportacaoXml> {
  return service.resolverCodigosImportados(itens);
}

export async function confirmarImportacaoXmlAction(
  pacoteId: string,
  decisoes: DecisaoItemXml[],
): Promise<ResultadoServico<{ criadas: number; ignoradas: number }>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.confirmarImportacaoXml(pacoteId, usuarioId, decisoes);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function listarLinhasAction(): Promise<{ id: string; nome: string; tipo: string }[]> {
  return service.listarLinhas();
}

export async function criarProdutoRapidoAction(dados: {
  linha_id: string;
  codigo_mestre: string;
  nome_tecnico: string;
  unidade?: string;
  tamanho_mm?: number | null;
}): Promise<{ id: string; codigo_mestre: string; nome: string; ja_existia: boolean }> {
  return service.criarProdutoRapido(dados);
}

export async function criarLinhaRapidaAction(dados: { nome: string; tipo: string }): Promise<{ id: string; nome: string; tipo: string; ja_existia: boolean }> {
  return service.criarLinhaRapida(dados);
}

export async function listarTiposLinhaAction(): Promise<{ nome: string; slug: string }[]> {
  return service.listarTiposLinha();
}

export async function cancelarNecessidadeAction(necessidadeId: string, motivo: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.cancelarNecessidade(necessidadeId, usuarioId, motivo);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function bloquearContextoAction(pacoteId: string, motivo: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.bloquearContexto(pacoteId, usuarioId, motivo);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function desbloquearContextoAction(pacoteId: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.desbloquearContexto(pacoteId, usuarioId);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

// ── Alocações (Bloco B) ──────────────────────────────────────

export async function obterCoberturaAction(
  necessidades: WiseNecessidade[],
): Promise<{ cobertura: CoberturaNecessidade[]; status: StatusSuprimentosCalculado }> {
  const cobertura = await service.obterCobertura(necessidades);
  const status = service.calcularStatusSuprimentos(necessidades, cobertura);
  return { cobertura, status };
}

export async function listarItensPedidoDoPacoteAction(pacoteId: string): Promise<PedidoItemDisponivel[]> {
  return service.listarItensPedidoDoPacote(pacoteId);
}

export async function alocarItemPedidoAction(dados: {
  pedido_item_id: string;
  necessidade_id: string;
  quantidade: number;
  solicitacao_item_alocacao_id?: string | null;
  justificativa?: string | null;
}): Promise<ResultadoServico<string>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.alocarItemPedido({ ...dados, usuario_id: usuarioId });
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function cancelarAlocacaoPedidoAction(id: string, motivo: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.cancelarAlocacaoPedido(id, usuarioId, motivo);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function listarItensSolicitacaoDoPacoteAction(pacoteId: string): Promise<SolicitacaoItemDisponivel[]> {
  return service.listarItensSolicitacaoDoPacote(pacoteId);
}

export async function alocarItemSolicitacaoAction(dados: {
  solicitacao_item_id: string;
  necessidade_id: string;
  quantidade: number;
}): Promise<ResultadoServico<string>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.alocarItemSolicitacao({ ...dados, usuario_id: usuarioId });
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function cancelarAlocacaoSolicitacaoAction(id: string, motivo: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.cancelarAlocacaoSolicitacao(id, usuarioId, motivo);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function listarRecebimentosDaNecessidadeAction(necessidadeId: string): Promise<RecebimentoItemDisponivel[]> {
  return service.listarRecebimentosDaNecessidade(necessidadeId);
}

export async function alocarItemRecebimentoAction(dados: {
  recebimento_item_id: string;
  pedido_item_alocacao_id: string;
  quantidade: number;
}): Promise<ResultadoServico<string>> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.alocarItemRecebimento({ ...dados, usuario_id: usuarioId });
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}

export async function estornarAlocacaoRecebimentoAction(id: string, motivo: string): Promise<ResultadoServico> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, erro: "Não autenticado" };
  const resultado = await service.estornarAlocacaoRecebimento(id, usuarioId, motivo);
  if (resultado.ok) revalidatePath("/squadwise/obras");
  return resultado;
}
