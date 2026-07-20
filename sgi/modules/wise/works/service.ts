import "server-only";

import * as repo from "./repository";
import type { TipologiaParseada } from "./lib/xml-tipologias";
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

// ── Tipologias do lote ──────────────────────────────────────────────────────

function normalizar(s: string | null | undefined): string | null {
  const v = s?.trim().toLowerCase();
  return v ? v : null;
}

// Casa cada tipologia do XML com uma já existente no lote — por
// codigo_esquadria primeiro (mais preciso), com fallback pra nome/tipo. Cada
// linha existente só é consumida por um match (evita duas linhas do XML
// caírem na mesma existente). Sem match → linha nova. `status` nunca é
// tocado num match (é controle de produção, não vem do XML).
export async function importarTipologiasXml(
  loteId: string,
  obraId: string,
  itens: TipologiaParseada[],
): Promise<ServiceResult<{ atualizadas: number; criadas: number }>> {
  if (!itens.length) return { ok: false, erro: "Nenhuma tipologia para importar." };

  try {
    const existentes = await repo.listarTipologiasPorLote(loteId);
    const consumidas = new Set<string>();
    const inserir: Array<Omit<repo.TipologiaRow, "id" | "status"> & { obra_id: string; lote_id: string }> = [];
    let atualizadas = 0;

    for (const item of itens) {
      const codigoItem = normalizar(item.codigo_esquadria);
      const nomeItem = normalizar(item.tipo) ?? normalizar(item.nome);

      const match = existentes.find((ex) => {
        if (consumidas.has(ex.id)) return false;
        const codigoEx = normalizar(ex.codigo_esquadria);
        if (codigoItem && codigoEx) return codigoItem === codigoEx;
        const nomeEx = normalizar(ex.tipo) ?? normalizar(ex.nome);
        return !codigoItem && !codigoEx && nomeItem !== null && nomeItem === nomeEx;
      });

      const campos = {
        nome: item.tipo || item.nome,
        quantidade: item.quantidade,
        codigo_esquadria: item.codigo_esquadria,
        tipo: item.tipo,
        largura_mm: item.largura_mm,
        altura_mm: item.altura_mm,
        tratamento: item.tratamento,
        descricao: item.descricao,
        peso_unit: item.peso_unit,
        preco_unit: item.preco_unit,
      };

      if (match) {
        consumidas.add(match.id);
        await repo.atualizarTipologia(match.id, campos);
        atualizadas++;
      } else {
        inserir.push({ ...campos, obra_id: obraId, lote_id: loteId });
      }
    }

    await repo.inserirTipologias(inserir);
    return { ok: true, data: { atualizadas, criadas: inserir.length } };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function adicionarTipologiaAoLote(
  loteId: string,
  obraId: string,
  dados: { nome: string; quantidade: number },
): Promise<ServiceResult> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome é obrigatório." };
  const quantidade = Number.isFinite(dados.quantidade) && dados.quantidade >= 1 ? dados.quantidade : 1;

  try {
    await repo.inserirTipologias([{
      obra_id: obraId, lote_id: loteId, nome, quantidade,
      codigo_esquadria: null, tipo: null, largura_mm: null, altura_mm: null,
      tratamento: null, descricao: null, peso_unit: null, preco_unit: null,
    }]);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}
