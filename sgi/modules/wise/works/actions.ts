"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { verificarPermissaoWise } from "@/modules/wise/access/service";
import * as service from "./service";
import type { WiseObraInput, WiseEstruturaInput } from "./types";
import type { TipologiaParseada } from "./lib/xml-tipologias";

async function contexto() {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) throw new Error("Usuário não encontrado no SquadWise.");
  return { empresaId: wiseUsuario.empresa_id, usuarioId: wiseUsuario.id };
}

// ── Obras ──────────────────────────────────────────────────────────────────

export async function listarObrasAction() {
  const { empresaId } = await contexto();
  return service.listarObras(empresaId);
}

export async function buscarObraAction(id: string) {
  const { empresaId } = await contexto();
  return service.buscarObra(id, empresaId);
}

export async function criarObraAction(input: WiseObraInput) {
  const { empresaId, usuarioId } = await contexto();
  const resultado = await service.criarObra(empresaId, usuarioId, input);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
  }
  return resultado;
}

export async function editarObraAction(id: string, input: Partial<WiseObraInput>) {
  const { empresaId } = await contexto();
  const resultado = await service.editarObra(id, empresaId, input);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
    revalidatePath(`/squadwise/obras/${id}`);
  }
  return resultado;
}

export async function arquivarObraAction(id: string) {
  const { empresaId } = await contexto();
  const resultado = await service.arquivarObra(id, empresaId);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
  }
  return resultado;
}

// ── Suporte ─────────────────────────────────────────────────────────────────

export async function listarStatusObraAction() {
  return service.listarStatusObra();
}

export async function listarClientesAction() {
  return service.listarClientes();
}

// ── Estrutura Física ────────────────────────────────────────────────────────

export async function listarEstruturaAction(obraId: string) {
  await contexto();
  return service.listarEstrutura(obraId);
}

export async function adicionarEstruturaAction(input: WiseEstruturaInput) {
  await contexto();
  const resultado = await service.adicionarEstrutura(input);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${input.obra_id}`);
  }
  return resultado;
}

export async function editarEstruturaAction(
  id: string,
  obraId: string,
  dados: Partial<Pick<WiseEstruturaInput, "nome" | "codigo" | "ordem">>,
) {
  await contexto();
  const resultado = await service.editarEstrutura(id, dados);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

export async function excluirEstruturaAction(id: string, obraId: string) {
  await contexto();
  const resultado = await service.excluirEstrutura(id);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

// ── Configuração do Lote ───────────────────────────────────────────────────

export async function atualizarLoteAction(
  loteId: string,
  obraId: string,
  dados: {
    nome?: string;
    etapa?: string;
    liberado_compras?: boolean;
    liberado_producao?: boolean;
    tipo_producao?: string | null;
    prioridade?: string | null;
  },
) {
  const { usuarioId } = await contexto();

  // Portões institucionais — exige permissão dedicada, distinta de
  // apenas "ver a página do lote" (ver seção 16.35 do documento mestre).
  if (dados.liberado_compras !== undefined) {
    const pode = await verificarPermissaoWise(usuarioId, "wise.pacotes.liberar_compras");
    if (!pode) return { ok: false as const, erro: "Sem permissão para liberar/revogar Compras neste pacote" };
  }
  if (dados.liberado_producao !== undefined) {
    const pode = await verificarPermissaoWise(usuarioId, "wise.pacotes.liberar_producao");
    if (!pode) return { ok: false as const, erro: "Sem permissão para liberar/revogar Produção neste pacote" };
  }

  const resultado = await service.atualizarLote(loteId, dados);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}/lotes/${loteId}`);
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

// ── Tipologias do lote ───────────────────────────────────────────────────────
// Ex-funcionalidade do SquadFrame (import de XML + adicionar tipologia
// avulsa) — movida pra cá porque o lote/tipologia é conceito do Wise; o
// SquadFrame agora só visualiza.

async function exigirPermissaoTipologias(usuarioId: string) {
  const pode = await verificarPermissaoWise(usuarioId, "wise.pacotes.editar");
  if (!pode) throw new Error("Sem permissão para editar tipologias deste pacote.");
}

export async function importarTipologiasXmlAction(
  loteId: string,
  obraId: string,
  itens: TipologiaParseada[],
) {
  const { usuarioId } = await contexto();
  await exigirPermissaoTipologias(usuarioId);

  const resultado = await service.importarTipologiasXml(loteId, obraId, itens);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}/lotes/${loteId}`);
  }
  return resultado;
}

export async function importarLoteXmlAction(
  obraId: string,
  nome: string,
  itens: TipologiaParseada[],
) {
  const { usuarioId } = await contexto();
  const pode = await verificarPermissaoWise(usuarioId, "wise.pacotes.criar");
  if (!pode) return { ok: false as const, erro: "Sem permissão para criar pacotes de trabalho nesta obra" };

  const resultado = await service.importarLoteXml(obraId, nome, itens);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

export async function adicionarTipologiaAction(
  loteId: string,
  obraId: string,
  formData: FormData,
) {
  const { usuarioId } = await contexto();
  await exigirPermissaoTipologias(usuarioId);

  const nome = String(formData.get("nome") || "");
  const quantidade = parseInt(String(formData.get("quantidade") || "1"), 10);

  const resultado = await service.adicionarTipologiaAoLote(loteId, obraId, { nome, quantidade });
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}/lotes/${loteId}`);
  }
  return resultado;
}
