import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type {
  WisePacote, WisePacoteModuloRow, WisePacoteEscopoEstrutura,
  WisePacoteEscopoTipologia, WisePacoteInput, WisePacoteStatus, WisePacoteModulo,
} from "./types";

const PACOTE_SELECT = `
  id, obra_id, empresa_id, nome, codigo, descricao, status,
  prioridade, prazo, responsavel_id, tipo, revisao, criado_em,
  responsavel:usuarios(id, nome),
  obra:obras(id, nome, codigo),
  modulos:wise_pacote_modulos(pacote_id, modulo, habilitado)
` as const;

export async function listarPacotesDaObra(obraId: string): Promise<WisePacote[]> {
  const { data } = await createAdminClient()
    .from("lotes_obra")
    .select(PACOTE_SELECT)
    .eq("obra_id", obraId)
    .order("criado_em", { ascending: false });
  return (data ?? []) as unknown as WisePacote[];
}

export async function listarPacotesDaEmpresa(empresaId: string): Promise<WisePacote[]> {
  const { data } = await createAdminClient()
    .from("lotes_obra")
    .select(PACOTE_SELECT)
    .eq("empresa_id", empresaId)
    .order("criado_em", { ascending: false });
  return (data ?? []) as unknown as WisePacote[];
}

export async function buscarPacotePorId(id: string): Promise<WisePacote | null> {
  const { data } = await createAdminClient()
    .from("lotes_obra")
    .select(PACOTE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as WisePacote | null;
}

export async function inserirPacote(
  dados: WisePacoteInput & { empresa_id: string; status: WisePacoteStatus; codigo: string },
): Promise<WisePacote> {
  const { modulos, ...campos } = dados;
  const { data, error } = await createAdminClient()
    .from("lotes_obra")
    .insert(campos)
    .select("id, nome, codigo, empresa_id, obra_id, status")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as WisePacote;
}

export async function atualizarPacote(
  id: string,
  dados: Partial<Omit<WisePacoteInput, "obra_id" | "modulos">>,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("lotes_obra")
    .update(dados)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function atualizarStatusPacote(
  id: string,
  status: WisePacoteStatus,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("lotes_obra")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirPacote(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("lotes_obra")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Módulos ─────────────────────────────────────────────────────────────────

export async function upsertModulos(
  pacoteId: string,
  modulos: WisePacoteModulo[],
): Promise<void> {
  const todos: WisePacoteModulo[] = ['frame', 'board', 'flow', 'stock', 'measure'];
  const rows = todos.map((m) => ({
    pacote_id: pacoteId,
    modulo: m,
    habilitado: modulos.includes(m),
  }));
  const { error } = await createAdminClient()
    .from("wise_pacote_modulos")
    .upsert(rows, { onConflict: "pacote_id,modulo" });
  if (error) throw new Error(error.message);
}

// ── Escopo — Estrutura ───────────────────────────────────────────────────────

export async function listarEscopoEstrutura(
  pacoteId: string,
): Promise<WisePacoteEscopoEstrutura[]> {
  const { data } = await createAdminClient()
    .from("wise_pacote_escopo_estrutura")
    .select("pacote_id, estrutura_id, estrutura:wise_obra_estrutura(tipo, nome, codigo, parent_id)")
    .eq("pacote_id", pacoteId);
  return (data ?? []) as unknown as WisePacoteEscopoEstrutura[];
}

export async function upsertEscopoEstrutura(
  pacoteId: string,
  estruturaIds: string[],
): Promise<void> {
  await createAdminClient()
    .from("wise_pacote_escopo_estrutura")
    .delete()
    .eq("pacote_id", pacoteId);
  if (!estruturaIds.length) return;
  const { error } = await createAdminClient()
    .from("wise_pacote_escopo_estrutura")
    .insert(estruturaIds.map((id) => ({ pacote_id: pacoteId, estrutura_id: id })));
  if (error) throw new Error(error.message);
}

// ── Escopo — Tipologias ──────────────────────────────────────────────────────

export async function listarEscopoTipologias(
  pacoteId: string,
): Promise<WisePacoteEscopoTipologia[]> {
  const { data } = await createAdminClient()
    .from("wise_pacote_escopo_tipologias")
    .select(`
      pacote_id, tipologia_id, quantidade,
      tipologia:tipologias_obra(nome, codigo_esquadria, quantidade, status)
    `)
    .eq("pacote_id", pacoteId);
  return (data ?? []) as unknown as WisePacoteEscopoTipologia[];
}

// ── Eventos ──────────────────────────────────────────────────────────────────

export async function publicarEvento(dados: {
  empresa_id: string;
  tipo: string;
  payload: Record<string, unknown>;
  obra_id?: string;
  pacote_id?: string;
  idempotency_key?: string;
}): Promise<void> {
  // upsert por idempotency_key — uma republicação da mesma ocorrência
  // semântica (ex: duplo clique, retry futuro) não gera uma segunda
  // linha. Sem chave explícita, o trigger default usa o próprio id
  // (equivalente a "sempre única", igual ao comportamento de antes).
  const { error } = await createAdminClient()
    .from("wise_eventos")
    .upsert(dados, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

// Auto-provisiona o contexto de Compras do Frame quando o pacote
// ativa com 'frame' habilitado — primeiro consumidor real de
// wise_eventos (antes disso só existia via clique manual em
// "Preparar contexto de Compras" no SquadFrame). Falha aqui não deve
// impedir a ativação do pacote: o botão manual continua funcionando
// como fallback.
export async function garantirContextoComprasSeFrameParticipa(pacoteId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: modulo } = await admin
    .from("wise_pacote_modulos")
    .select("habilitado")
    .eq("pacote_id", pacoteId)
    .eq("modulo", "frame")
    .maybeSingle();
  if (!modulo?.habilitado) return;

  const { error } = await admin.rpc("fn_frame_ensure_package_procurement_context_system", {
    p_pacote_id: pacoteId,
  });
  if (error) throw new Error(error.message);
}

// ── Código sequencial ────────────────────────────────────────────────────────

export async function proximoCodigo(obraId: string): Promise<string> {
  const { count } = await createAdminClient()
    .from("lotes_obra")
    .select("*", { count: "exact", head: true })
    .eq("obra_id", obraId);
  const seq = (count ?? 0) + 1;
  const hoje = new Date();
  const aaaa = hoje.getFullYear();
  return `PAT-${aaaa}-${String(seq).padStart(3, "0")}`;
}
