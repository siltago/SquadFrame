import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { listarSaldosPorFornecedor, filtrarSaldoBaixo } from "@/modules/squadframe/services/financeiro/carteira-alertas";
import { hojeSaoPaulo } from "@/modules/squadframe/services/cobranca/executar-cobranca";
import type { UsuarioAtual } from "@/shared/auth/auth";
import type { Destaque } from "./types";

const MAX_CARTEIRAS_LISTADAS = 3;

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasDesde(data: string | null | undefined): number {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

function temPermissao(usuario: UsuarioAtual, chave: string): boolean {
  return usuario.permissoes?.includes("*") || usuario.permissoes?.includes(chave) || false;
}

// Banner de primeiro acesso do dia — mesmos 4 tipos do card "Destaques" da
// dashboard (ver dashboard-alertas.tsx), mas aqui cada tipo só aparece pra
// quem tem a permissão de agir sobre ele (o card na dashboard é mais
// informativo/geral; o banner é "isso é seu problema, resolve"). Some
// enquanto usuario_destaque_snooze.snoozed_em == hoje (ver
// adiarDestaquesParaAmanha).
export async function detectarDestaquesDashboard(usuario: UsuarioAtual): Promise<Destaque[]> {
  const admin = createAdminClient();

  const hojeIso = new Date().toISOString().slice(0, 10);
  const { data: snooze } = await admin
    .from("usuario_destaque_snooze")
    .select("snoozed_em")
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  if (snooze?.snoozed_em === hojeIso) return [];

  const podeRecebimento = temPermissao(usuario, PERMISSIONS.COMPRAS_RECEBIMENTO_REGISTRAR);
  const podeAprovarPedido = temPermissao(usuario, PERMISSIONS.COMPRAS_PEDIDO_APROVAR);
  const podeContrato = temPermissao(usuario, PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR);

  const [atrasadosRes, semPrazoRes, paradosRes] = await Promise.all([
    podeRecebimento
      ? admin.from("pedidos_compra").select("id", { count: "exact", head: true })
          .eq("status", "AGUARDANDO_RECEBIMENTO").lt("prazo_entrega", hojeSaoPaulo())
      : Promise.resolve({ count: 0 }),
    podeRecebimento
      ? admin.from("pedidos_compra").select("id", { count: "exact", head: true })
          .eq("status", "AGUARDANDO_RECEBIMENTO").is("prazo_entrega", null)
      : Promise.resolve({ count: 0 }),
    podeAprovarPedido
      ? admin.from("pedidos_compra").select("criado_em, atualizado_em").eq("status", "AGUARDANDO_APROVACAO")
      : Promise.resolve({ data: [] as { criado_em: string; atualizado_em: string | null }[] }),
  ]);

  const qtdAtrasados = atrasadosRes.count ?? 0;
  const qtdSemPrazo = semPrazoRes.count ?? 0;
  const qtdParadosAprovacao = ("data" in paradosRes ? paradosRes.data ?? [] : [])
    .filter((p) => diasDesde(p.atualizado_em ?? p.criado_em) > 3).length;

  const carteirasAlerta = podeContrato
    ? filtrarSaldoBaixo(await listarSaldosPorFornecedor(admin))
    : [];

  const destaques: Destaque[] = [];

  if (qtdAtrasados > 0) {
    destaques.push({
      tipo: "PEDIDOS_ATRASADOS",
      variant: "danger",
      titulo: `${qtdAtrasados} pedido${qtdAtrasados !== 1 ? "s" : ""} com entrega atrasada`,
      corpo: "O prazo combinado já passou — vale cobrar o fornecedor.",
      href: "/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO&atraso=1",
    });
  }
  if (qtdSemPrazo > 0) {
    destaques.push({
      tipo: "PEDIDOS_SEM_PRAZO",
      variant: "warning",
      titulo: `${qtdSemPrazo} pedido${qtdSemPrazo !== 1 ? "s" : ""} aguardando recebimento sem data de entrega`,
      corpo: "Sem prazo cadastrado não dá pra saber se está atrasado — vale completar com o fornecedor.",
      href: "/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO",
    });
  }
  if (qtdParadosAprovacao > 0) {
    destaques.push({
      tipo: "PEDIDOS_PARADOS_APROVACAO",
      variant: "warning",
      titulo: `${qtdParadosAprovacao} pedido${qtdParadosAprovacao !== 1 ? "s" : ""} aguardando aprovação há mais de 3 dias`,
      corpo: "Parados sem decisão — vale revisar antes que virem gargalo.",
      href: "/squadframe/compras/pedidos?status=AGUARDANDO_APROVACAO",
    });
  }
  if (carteirasAlerta.length > 0) {
    const listagem = carteirasAlerta
      .slice(0, MAX_CARTEIRAS_LISTADAS)
      .map((c) => `${c.fornecedor}${c.qtdObras > 1 ? ` (${c.qtdObras} obras)` : ""} — ${fmt(c.saldo)}`)
      .join(", ");
    const resto = carteirasAlerta.length > MAX_CARTEIRAS_LISTADAS ? ` e mais ${carteirasAlerta.length - MAX_CARTEIRAS_LISTADAS}` : "";
    destaques.push({
      tipo: "CARTEIRAS_SALDO_BAIXO",
      variant: "danger",
      titulo: `${carteirasAlerta.length} fornecedor${carteirasAlerta.length !== 1 ? "es" : ""} com saldo zerado ou abaixo de 25% do total depositado`,
      corpo: `${listagem}${resto}`,
      href: "/squadframe/financeiro?aba=carteiras",
    });
  }

  return destaques;
}
