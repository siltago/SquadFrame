import "server-only";

import * as repo from "./repository";
import type {
  WiseObra, WiseObraEstrutura, WiseObraInput, WiseEstruturaInput,
  WiseObraStatusRow, WiseCliente, ServiceResult,
} from "./types";

// ── Obras ──────────────────────────────────────────────────────────────────

export async function listarObras(empresaId: string): Promise<WiseObra[]> {
  return repo.listarObras(empresaId);
}

export async function buscarObra(
  id: string,
  empresaId: string,
): Promise<WiseObra | null> {
  return repo.buscarObraPorId(id, empresaId);
}

export async function criarObra(
  empresaId: string,
  usuarioId: string,
  input: WiseObraInput,
): Promise<ServiceResult<WiseObra>> {
  if (!input.nome.trim()) return { ok: false, erro: "Nome da obra é obrigatório." };
  if (!input.cliente_id) return { ok: false, erro: "Cliente é obrigatório." };
  if (!input.status_id)  return { ok: false, erro: "Status é obrigatório." };
  try {
    const obra = await repo.inserirObra({ ...input, empresa_id: empresaId, criado_por: usuarioId });
    return { ok: true, data: obra };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function editarObra(
  id: string,
  empresaId: string,
  input: Partial<WiseObraInput>,
): Promise<ServiceResult> {
  if (input.nome !== undefined && !input.nome.trim())
    return { ok: false, erro: "Nome da obra não pode ser vazio." };
  try {
    await repo.atualizarObra(id, empresaId, input);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function arquivarObra(
  id: string,
  empresaId: string,
): Promise<ServiceResult> {
  try {
    await repo.arquivarObra(id, empresaId);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

// ── Suporte ─────────────────────────────────────────────────────────────────

export async function listarStatusObra(): Promise<WiseObraStatusRow[]> {
  return repo.listarStatus();
}

export async function listarClientes(): Promise<WiseCliente[]> {
  return repo.listarClientes();
}

// ── Estrutura Física ────────────────────────────────────────────────────────

export function construirArvore(nos: WiseObraEstrutura[]): WiseObraEstrutura[] {
  const map = new Map(nos.map((n) => [n.id, { ...n, filhos: [] as WiseObraEstrutura[] }]));
  const raizes: WiseObraEstrutura[] = [];
  for (const no of map.values()) {
    if (no.parent_id) {
      map.get(no.parent_id)?.filhos?.push(no);
    } else {
      raizes.push(no);
    }
  }
  return raizes;
}

export async function listarEstrutura(obraId: string): Promise<WiseObraEstrutura[]> {
  const nos = await repo.listarEstrutura(obraId);
  return construirArvore(nos);
}

export async function listarEstruturaFlat(obraId: string): Promise<WiseObraEstrutura[]> {
  return repo.listarEstrutura(obraId);
}

export async function adicionarEstrutura(
  input: WiseEstruturaInput,
): Promise<ServiceResult<WiseObraEstrutura>> {
  if (!input.nome.trim()) return { ok: false, erro: "Nome é obrigatório." };
  try {
    const no = await repo.inserirEstrutura(input);
    return { ok: true, data: no };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function editarEstrutura(
  id: string,
  dados: Partial<Pick<WiseEstruturaInput, "nome" | "codigo" | "ordem">>,
): Promise<ServiceResult> {
  try {
    await repo.atualizarEstrutura(id, dados);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function excluirEstrutura(id: string): Promise<ServiceResult> {
  try {
    await repo.excluirEstrutura(id);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

// ── Lote ───────────────────────────────────────────────────────────────────

export async function atualizarLote(
  loteId: string,
  dados: {
    nome?: string;
    etapa?: string;
    liberado_compras?: boolean;
    liberado_producao?: boolean;
    tipo_producao?: string | null;
    prioridade?: string | null;
  },
): Promise<ServiceResult> {
  try {
    await repo.atualizarLote(loteId, dados);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}
