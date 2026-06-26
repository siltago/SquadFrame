import "server-only";
import { createAdminClient } from "./supabase-admin";

// Colunas do fluxo de Compras em ordem visual
// "Solicitações em aprovação" foi adicionada para reflectir PURCHASE_REQUEST_SUBMITTED
export const COLUNAS_COMPRAS = [
  { nome: "Solicitações abertas",      ordem: 0, tipo: "PADRAO" as const, aceita_automaticas: true  },
  { nome: "Solicitações em aprovação", ordem: 1, tipo: "PADRAO" as const, aceita_automaticas: true  },
  { nome: "Rascunho",                  ordem: 2, tipo: "PADRAO" as const, aceita_automaticas: true  },
  { nome: "Aguard. Aprovação",         ordem: 3, tipo: "PADRAO" as const, aceita_automaticas: true  },
  { nome: "Aprovados",                 ordem: 4, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Em Recebimento",            ordem: 5, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Concluído",                 ordem: 6, tipo: "PADRAO" as const, aceita_automaticas: false },
];

// Mapeamento de status do pedido → nome da coluna
const STATUS_PEDIDO_COLUNA: Record<string, string> = {
  RASCUNHO:               "Rascunho",
  AGUARDANDO_APROVACAO:   "Aguard. Aprovação",
  APROVADO:               "Aprovados",
  AGUARDANDO_RECEBIMENTO: "Em Recebimento",
  RECEBIDO_PARCIAL:       "Em Recebimento",
  RECEBIDO:               "Concluído",
  FINALIZADO:             "Concluído",
  CANCELADO:              "Concluído",
};

export async function getSetorComprasId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("setores")
    .select("id")
    .ilike("nome", "%compra%")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Garante que as colunas de Compras existem; retorna mapa nome→id
export async function garantirColunasCompras(setorId: string): Promise<Record<string, string>> {
  const admin = createAdminClient();

  const { data: existentes } = await admin
    .from("colunas_kanban")
    .select("id, nome, tipo")
    .eq("setor_id", setorId);

  // Mapa nome→id: se houver duplicatas, prefere tipo PADRAO, senão primeira ocorrência
  const mapa: Record<string, string> = {};
  for (const c of existentes ?? []) {
    if (!mapa[c.nome] || c.tipo === "PADRAO") mapa[c.nome] = c.id;
  }

  const faltam = COLUNAS_COMPRAS.filter((c) => !mapa[c.nome]);
  if (faltam.length > 0) {
    const { data: criadas, error: errCols } = await admin
      .from("colunas_kanban")
      .insert(faltam.map((c) => ({ ...c, setor_id: setorId, usuario_id: null, cor: null })))
      .select("id, nome");
    if (errCols) throw new Error(`garantirColunasCompras: ${errCols.message}`);
    for (const c of criadas ?? []) mapa[c.nome] = c.id;
  }

  return mapa;
}

export async function colunaPorStatusPedido(setorId: string, status: string): Promise<string | null> {
  const nomeColuna = STATUS_PEDIDO_COLUNA[status];
  if (!nomeColuna) return null;
  const mapa = await garantirColunasCompras(setorId);
  return mapa[nomeColuna] ?? null;
}

// Move a tarefa vinculada a um pedido para a coluna correta.
//
// BUG 1 FIX: separa "mover para coluna terminal" de "definir status da tarefa".
//   CANCELADO → coluna "Concluído" + status "CANCELADA"  (antes era "CONCLUIDA" — errado)
//   RECEBIDO / FINALIZADO → coluna "Concluído" + status "CONCLUIDA"
//   Demais → só muda coluna, não toca o status
export async function moverTarefaPedido(pedidoId: string, novoStatus: string, usuarioId?: string) {
  const admin = createAdminClient();

  const setorId = await getSetorComprasId();
  if (!setorId) return;

  const colunaId = await colunaPorStatusPedido(setorId, novoStatus);
  if (!colunaId) return;

  const { data: tarefa } = await admin
    .from("tarefas")
    .select("id, coluna_id")
    .eq("entidade_ref", "pedido")
    .eq("entidade_ref_id", pedidoId)
    .is("deleted_at", null)
    .not("status", "in", '("CANCELADA")')
    .maybeSingle();

  if (!tarefa) return;

  // Separa "é um estado terminal" de "qual status a tarefa recebe"
  const moveParaColunaFinal = ["RECEBIDO", "FINALIZADO", "CANCELADO"].includes(novoStatus);
  const statusTarefa =
    novoStatus === "CANCELADO" ? "CANCELADA"   // pedido cancelado → tarefa CANCELADA
    : moveParaColunaFinal      ? "CONCLUIDA"   // recebido/finalizado → tarefa CONCLUIDA
    : undefined;                               // demais → não altera status

  // Pedido aprovado → atribui a tarefa de volta ao comprador para aparecer em Minha Central
  let compradorId: string | undefined;
  if (novoStatus === "APROVADO") {
    const { data: ped } = await admin
      .from("pedidos_compra")
      .select("comprador_id")
      .eq("id", pedidoId)
      .single();
    compradorId = ped?.comprador_id ?? undefined;
  }

  // Só pula se a coluna já está certa E não há atribuição de comprador para fazer
  const precisaMoverColuna = tarefa.coluna_id !== colunaId;
  const precisaAtribuir = !!compradorId;
  if (!precisaMoverColuna && !precisaAtribuir) return;

  await admin.from("tarefas").update({
    ...(precisaMoverColuna ? { coluna_id: colunaId } : {}),
    ...(statusTarefa
      ? { status: statusTarefa, concluida_em: new Date().toISOString() }
      : {}),
    ...(compradorId
      ? { usuario_responsavel_id: compradorId, status: "ACEITA" }
      : {}),
  }).eq("id", tarefa.id);

  await admin.from("tarefa_historico").insert({
    tarefa_id: tarefa.id,
    usuario_id: usuarioId ?? null,
    acao: "MOVIDA_AUTOMATICAMENTE",
    dados: { status: novoStatus, coluna_id: colunaId, ...(compradorId ? { atribuida_a: compradorId } : {}) },
  });
}
