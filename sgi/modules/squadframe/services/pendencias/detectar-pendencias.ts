import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import type { TipoPendencia, Pendencia } from "./types";

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diasDesde(d: Date): number {
  const hoje = inicioDoDia(new Date());
  const dia = inicioDoDia(d);
  return Math.round((hoje.getTime() - dia.getTime()) / 86_400_000);
}

type Candidata = {
  pedido: { id: string; numero: string; fornecedor: unknown };
  tipo: TipoPendencia;
  ultimoToque: Date;
};

// Núcleo de detecção compartilhado entre o banner (detectarPendenciasComprador,
// que some com a pendência quando justificada/adiada hoje) e o gate de
// bloqueio (detectarPendenciasBrutas, que NUNCA filtra por justificativa/
// snooze — a gravidade real não pode ser resetada por um "Lembrar amanhã").
async function coletarCandidatas(usuarioId: string): Promise<Candidata[]> {
  const admin = createAdminClient();

  const { data: pedidos } = await admin
    .from("pedidos_compra")
    .select("id, numero, status, criado_em, prazo_entrega, valor_final, fornecedor:fornecedores(nome)")
    .eq("comprador_id", usuarioId)
    .in("status", ["RASCUNHO", "APROVADO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO"]);

  if (!pedidos || pedidos.length === 0) return [];

  const ids = pedidos.map((p) => p.id);

  const { data: historico } = await admin
    .from("compra_historico")
    .select("entidade_id, criado_em")
    .eq("entidade", "pedido")
    .in("entidade_id", ids);

  const ultimoToqueMap = new Map<string, string>();
  for (const h of historico ?? []) {
    const atual = ultimoToqueMap.get(h.entidade_id);
    if (!atual || h.criado_em > atual) ultimoToqueMap.set(h.entidade_id, h.criado_em);
  }

  const hoje = inicioDoDia(new Date());
  const candidatas: Candidata[] = [];

  for (const pedido of pedidos) {
    const ultimoToque = new Date(ultimoToqueMap.get(pedido.id) ?? pedido.criado_em);
    const tocadoHoje = inicioDoDia(ultimoToque).getTime() >= hoje.getTime();

    if (pedido.status === "RASCUNHO" && !tocadoHoje) {
      candidatas.push({ pedido, tipo: "RASCUNHO_ESQUECIDO", ultimoToque });
    } else if (pedido.status === "APROVADO" && !tocadoHoje) {
      candidatas.push({ pedido, tipo: "APROVADO_SEM_EMITIR", ultimoToque });
    } else if (["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(pedido.status) && pedido.prazo_entrega) {
      const prazo = new Date(`${pedido.prazo_entrega}T00:00:00`);
      if (prazo.getTime() < hoje.getTime()) {
        candidatas.push({ pedido, tipo: "PRAZO_VENCIDO", ultimoToque: prazo });
      }
    } else if (pedido.status === "RECEBIDO" && pedido.valor_final == null && !tocadoHoje) {
      candidatas.push({ pedido, tipo: "RECEBIDO_SEM_VALOR", ultimoToque });
    }
  }

  return candidatas;
}

function mapearParaPendencia(c: Candidata, ultimoMotivo: string | null): Pendencia {
  return {
    pedidoId: c.pedido.id,
    numero: c.pedido.numero,
    fornecedorNome: (c.pedido.fornecedor as unknown as { nome: string } | null)?.nome ?? null,
    tipo: c.tipo,
    diasEmAberto: diasDesde(c.ultimoToque),
    ultimoMotivo,
  };
}

// Pendências ficam visíveis pro comprador (dono do pedido) enquanto o pedido
// não muda de fato — resolução é sempre automática (ver TRANSICOES_PEDIDO em
// state-machines/compras.ts), nunca por um botão "marcar como resolvido".
// A justificativa registrada hoje só silencia o banner por hoje; se amanhã o
// pedido continuar no mesmo estado, a pendência reaparece puxando o motivo
// mais recente como contexto.
export async function detectarPendenciasComprador(usuarioId: string): Promise<Pendencia[]> {
  const admin = createAdminClient();

  const hojeIso = new Date().toISOString().slice(0, 10);
  const { data: snooze } = await admin
    .from("usuario_pendencia_snooze")
    .select("snoozed_em")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (snooze?.snoozed_em === hojeIso) return [];

  const candidatas = await coletarCandidatas(usuarioId);
  if (candidatas.length === 0) return [];

  const hoje = inicioDoDia(new Date());
  const { data: justificativas } = await admin
    .from("pedido_pendencia_justificativas")
    .select("pedido_id, tipo_pendencia, motivo, criado_em")
    .in("pedido_id", candidatas.map((c) => c.pedido.id))
    .order("criado_em", { ascending: false });

  const jaJustificadaHoje = new Set<string>();
  const ultimoMotivoMap = new Map<string, string>();
  for (const j of justificativas ?? []) {
    const chave = `${j.pedido_id}:${j.tipo_pendencia}`;
    if (!ultimoMotivoMap.has(chave)) ultimoMotivoMap.set(chave, j.motivo);
    if (inicioDoDia(new Date(j.criado_em)).getTime() >= hoje.getTime()) {
      jaJustificadaHoje.add(chave);
    }
  }

  return candidatas
    .filter((c) => !jaJustificadaHoje.has(`${c.pedido.id}:${c.tipo}`))
    .map((c) => mapearParaPendencia(c, ultimoMotivoMap.get(`${c.pedido.id}:${c.tipo}`) ?? null));
}

// Variante usada SÓ pelo gate de bloqueio (verificar-bloqueio.ts) — sem
// checar snooze nem "justificada hoje", pra que a gravidade real (dias em
// aberto) nunca seja resetada por um "Lembrar amanhã" ou justificativa do
// dia. A cobertura de pendência aqui é resolvida separadamente, por
// prorrogação/exceção ativa (ver pedido_pendencia_prorrogacoes).
export async function detectarPendenciasBrutas(usuarioId: string): Promise<Pendencia[]> {
  const candidatas = await coletarCandidatas(usuarioId);
  return candidatas.map((c) => mapearParaPendencia(c, null));
}
