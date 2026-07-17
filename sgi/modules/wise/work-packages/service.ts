import "server-only";

import * as repo from "./repository";
import type {
  WisePacote, WisePacoteInput, WisePacoteStatus,
  WisePacoteEscopoEstrutura, WisePacoteEscopoTipologia,
  ServiceResult, WisePacoteModulo,
} from "./types";

// Transições de status permitidas
const TRANSICOES: Record<WisePacoteStatus, WisePacoteStatus[]> = {
  RASCUNHO:  ['ATIVO', 'CANCELADO'],
  ATIVO:     ['SUSPENSO', 'CONCLUIDO', 'CANCELADO'],
  SUSPENSO:  ['ATIVO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

export async function listarPacotesDaObra(obraId: string): Promise<WisePacote[]> {
  return repo.listarPacotesDaObra(obraId);
}

export async function listarPacotesDaEmpresa(empresaId: string): Promise<WisePacote[]> {
  return repo.listarPacotesDaEmpresa(empresaId);
}

export async function buscarPacote(id: string): Promise<WisePacote | null> {
  return repo.buscarPacotePorId(id);
}

export async function criarPacote(
  empresaId: string,
  input: WisePacoteInput,
): Promise<ServiceResult<WisePacote>> {
  if (!input.nome.trim()) return { ok: false, erro: "Nome do pacote é obrigatório." };
  if (!input.obra_id)     return { ok: false, erro: "Obra é obrigatória." };
  try {
    const codigo = await repo.proximoCodigo(input.obra_id);
    const { modulos, ...campos } = input;
    const pacote = await repo.inserirPacote({
      ...campos,
      empresa_id: empresaId,
      status: 'RASCUNHO',
      codigo,
    });

    // Persistir módulos participantes
    const modulosSelecionados: WisePacoteModulo[] = modulos?.length
      ? modulos
      : ['frame', 'board'];
    await repo.upsertModulos(pacote.id, modulosSelecionados);

    // Publicar evento de criação
    await repo.publicarEvento({
      empresa_id: empresaId,
      tipo: 'wise.work_package.created',
      payload: {
        pacote_id: pacote.id,
        codigo: pacote.codigo,
        nome: pacote.nome,
        modulos: modulosSelecionados,
      },
      obra_id: input.obra_id,
      pacote_id: pacote.id,
      idempotency_key: `wise.work_package.created:${pacote.id}`,
    });

    return { ok: true, data: pacote };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function editarPacote(
  id: string,
  input: Partial<Omit<WisePacoteInput, "obra_id">>,
): Promise<ServiceResult> {
  if (input.nome !== undefined && !input.nome.trim())
    return { ok: false, erro: "Nome não pode ser vazio." };
  try {
    const { modulos, ...campos } = input;
    await repo.atualizarPacote(id, campos);
    if (modulos) await repo.upsertModulos(id, modulos);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function transicionarStatus(
  id: string,
  empresaId: string,
  novoStatus: WisePacoteStatus,
): Promise<ServiceResult> {
  const pacote = await repo.buscarPacotePorId(id);
  if (!pacote) return { ok: false, erro: "Pacote não encontrado." };
  if (!TRANSICOES[pacote.status].includes(novoStatus)) {
    return {
      ok: false,
      erro: `Não é possível passar de ${pacote.status} para ${novoStatus}.`,
    };
  }
  try {
    await repo.atualizarStatusPacote(id, novoStatus);
    await repo.publicarEvento({
      empresa_id: empresaId,
      tipo: `wise.work_package.${novoStatus.toLowerCase()}`,
      payload: { pacote_id: id, status_anterior: pacote.status, status_novo: novoStatus },
      obra_id: pacote.obra_id,
      pacote_id: id,
      idempotency_key: `wise.work_package.${novoStatus.toLowerCase()}:${id}:${pacote.status}->${novoStatus}`,
    });

    if (novoStatus === 'ATIVO') {
      // Falha no auto-provisionamento não desfaz a ativação — o
      // botão manual "Preparar contexto de Compras" segue como
      // fallback (ver repo.garantirContextoComprasSeFrameParticipa).
      try {
        await repo.garantirContextoComprasSeFrameParticipa(id);
      } catch {
        // intencionalmente silencioso — ver comentário acima.
      }
    }

    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function definirEscopoEstrutura(
  pacoteId: string,
  estruturaIds: string[],
): Promise<ServiceResult> {
  try {
    await repo.upsertEscopoEstrutura(pacoteId, estruturaIds);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}

export async function listarEscopoEstrutura(
  pacoteId: string,
): Promise<WisePacoteEscopoEstrutura[]> {
  return repo.listarEscopoEstrutura(pacoteId);
}

export async function listarEscopoTipologias(
  pacoteId: string,
): Promise<WisePacoteEscopoTipologia[]> {
  return repo.listarEscopoTipologias(pacoteId);
}
