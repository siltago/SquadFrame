import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { detectarPendenciasBrutas } from "./detectar-pendencias";
import { calcularSeveridade, NIVEL_MINIMO_PARA_BLOQUEAR_ACAO, type AcaoCompras, type NivelSeveridade } from "./constantes";

export type ResultadoBloqueio = {
  bloqueado: boolean;
  nivel: NivelSeveridade;
  pendenciasCausadoras: { pedidoId: string; numero: string; tipo: string; diasEmAberto: number }[];
};

const ORDEM_NIVEL: NivelSeveridade[] = ["NORMAL", "ATENCAO", "BLOQUEIO_CRIACAO", "BLOQUEIO_EMISSAO"];

// Server-only, chamada tanto pelas actions (verificarBloqueioCompras, que
// lança Error) quanto pelo layout (só lê o resultado, pra desabilitar botões
// antecipadamente). A cobertura de prorrogação/exceção é recalculada AQUI,
// nunca persistida: uma prorrogação cobre a pendência enquanto
// status='ATIVA' E nova_data_compromisso >= hoje — assim que vence, para de
// contar como cobertura sozinha, sem job nem UPDATE nenhum.
export async function calcularBloqueio(usuarioId: string): Promise<ResultadoBloqueio> {
  const admin = createAdminClient();
  const brutas = await detectarPendenciasBrutas(usuarioId);
  if (!brutas.length) return { bloqueado: false, nivel: "NORMAL", pendenciasCausadoras: [] };

  const { data: prorrogacoesAtivas } = await admin
    .from("pedido_pendencia_prorrogacoes")
    .select("pedido_id, tipo_pendencia, nova_data_compromisso")
    .in("pedido_id", brutas.map((p) => p.pedidoId))
    .eq("status", "ATIVA");

  const hojeIso = new Date().toISOString().slice(0, 10);
  const cobertas = new Set(
    (prorrogacoesAtivas ?? [])
      .filter((pr) => pr.nova_data_compromisso >= hojeIso)
      .map((pr) => `${pr.pedido_id}:${pr.tipo_pendencia}`),
  );

  const naoCobertas = brutas.filter((p) => !cobertas.has(`${p.pedidoId}:${p.tipo}`));
  if (!naoCobertas.length) return { bloqueado: false, nivel: "NORMAL", pendenciasCausadoras: [] };

  let pior: NivelSeveridade = "NORMAL";
  const causadoras: ResultadoBloqueio["pendenciasCausadoras"] = [];
  for (const p of naoCobertas) {
    const prazoVencido = p.tipo === "PRAZO_VENCIDO";
    const nivel = calcularSeveridade(p.diasEmAberto, prazoVencido);
    if (ORDEM_NIVEL.indexOf(nivel) > ORDEM_NIVEL.indexOf(pior)) pior = nivel;
    if (nivel !== "NORMAL") causadoras.push({ pedidoId: p.pedidoId, numero: p.numero, tipo: p.tipo, diasEmAberto: p.diasEmAberto });
  }

  return {
    bloqueado: pior === "BLOQUEIO_CRIACAO" || pior === "BLOQUEIO_EMISSAO",
    nivel: pior,
    pendenciasCausadoras: causadoras,
  };
}

// Chamada nas actions de compras — lança Error, mesmo padrão de
// verificarPermissao (shared/auth/check-permission.ts): sem redirect/
// middleware, o erro sobe pro client via server action e é tratado lá.
export async function verificarBloqueioCompras(usuarioId: string, acao: AcaoCompras): Promise<void> {
  const resultado = await calcularBloqueio(usuarioId);
  if (resultado.nivel === "NORMAL" || resultado.nivel === "ATENCAO") return;

  const niveisQueBloqueiamAcao = NIVEL_MINIMO_PARA_BLOQUEAR_ACAO[acao];
  if (!niveisQueBloqueiamAcao.includes(resultado.nivel)) return;

  const lista = resultado.pendenciasCausadoras.map((p) => `${p.numero} (${p.diasEmAberto}d)`).join(", ");
  throw new Error(
    `Ação bloqueada: você tem pendência(s) crítica(s) em aberto há mais tempo do que o tolerado (${lista}). ` +
    `Resolva ou solicite prorrogação/exceção nas Pendências de Compras antes de continuar.`,
  );
}
