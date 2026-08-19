import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { MinhaCentral } from "@/modules/squadframe/components/kanban/minha-central";
import { RealtimeRefresher, type RealtimeSub } from "@/modules/squadframe/components/realtime-refresher";
import { CentralTabNav } from "@/modules/squadframe/components/cobranca/tab-nav";
import { CobrancaDashboard } from "@/modules/squadframe/components/cobranca/cobranca-dashboard";
import { buscarRelatorioCobranca } from "@/modules/squadframe/services/cobranca/relatorio";
import { DashboardAlertas } from "@/modules/squadframe/components/dashboard-alertas";
import { hojeSaoPaulo } from "@/modules/squadframe/services/cobranca/executar-cobranca";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { listarSaldosPorFornecedor, filtrarSaldoBaixo } from "@/modules/squadframe/services/financeiro/carteira-alertas";

export const dynamic = "force-dynamic";

const PEDIDO_COMPRADOR_SELECT = "id, numero, tipo_linha, fornecedor:fornecedores(nome), obra:obras(nome)";

function diasDesde(data: string | null | undefined): number {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { aba?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();

  const podeAprovarPedidoTab =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes("compras.pedido.aprovar") || false;
  const podeAprovarSolicitacaoTab =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes("compras.solicitacao.aprovar") || false;
  const podeCobranca = podeAprovarPedidoTab || podeAprovarSolicitacaoTab;

  // Dashboard é a aba inicial padrão pra quem tem acesso a ela — só cai em
  // "central" se o usuário pedir explicitamente ou não tiver permissão de
  // cobrança nenhuma.
  const abaAtual =
    searchParams.aba === "central" ? "central"
    : searchParams.aba === "cobranca" && podeCobranca ? "cobranca"
    : podeCobranca ? "cobranca" : "central";

  if (abaAtual === "cobranca") {
    // Destaques — só existem na aba "dashboard" (cobrança); ao trocar pra
    // "central" eles somem, por isso todo esse cálculo fica dentro do branch.
    const hojeISO = hojeSaoPaulo();
    const [atrasadosRes, semPrazoRes, paradosRes] = await Promise.all([
      admin
        .from("pedidos_compra")
        .select("id", { count: "exact", head: true })
        .eq("status", "AGUARDANDO_RECEBIMENTO")
        .lt("prazo_entrega", hojeISO),
      admin
        .from("pedidos_compra")
        .select("id", { count: "exact", head: true })
        .eq("status", "AGUARDANDO_RECEBIMENTO")
        .is("prazo_entrega", null),
      podeAprovarPedidoTab
        ? admin.from("pedidos_compra").select("criado_em, atualizado_em").eq("status", "AGUARDANDO_APROVACAO")
        : Promise.resolve({ data: [] as { criado_em: string; atualizado_em: string | null }[] }),
    ]);

    const qtdParadosAprovacao = (paradosRes.data ?? []).filter(
      (p) => diasDesde(p.atualizado_em ?? p.criado_em) > 3,
    ).length;

    // Carteiras com saldo zerado ou abaixo de 25% do total já depositado —
    // só pra quem tem permissão de ver carteira. Não há coluna de "saldo
    // inicial" ou pico histórico no schema (saldo_atual nem aceita valor
    // negativo, tem CHECK >= 0), então "o valor que tinha antes" é
    // aproximado pela soma de todos os depósitos já feitos (mesmo cálculo
    // já usado no detalhe de carteira, aqui agregado pra todas de uma vez).
    const podeCarteiras =
      usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CARTEIRA_VER) || false;

    const carteirasAlerta = podeCarteiras
      ? filtrarSaldoBaixo(await listarSaldosPorFornecedor(admin))
      : [];

    const alertas = (
      <DashboardAlertas
        qtdAtrasados={atrasadosRes.count ?? 0}
        qtdSemPrazo={semPrazoRes.count ?? 0}
        qtdParadosAprovacao={qtdParadosAprovacao}
        carteirasAlerta={carteirasAlerta}
      />
    );

    // Qualquer mudança em pedidos_compra pode mudar atrasados/sem-prazo/parados
    // (não dá pra filtrar por usuário — os destaques são do sistema todo), e
    // mudanças em carteiras/carteira_movimentacoes podem mudar o alerta de
    // saldo — só assina essas duas últimas se o usuário nem vê carteira mesmo.
    const subsAlertas: RealtimeSub[] = [
      { table: "pedidos_compra" },
      ...(podeCarteiras ? [{ table: "carteiras" } as RealtimeSub, { table: "carteira_movimentacoes" } as RealtimeSub] : []),
    ];

    const relatorio = await buscarRelatorioCobranca(admin);

    return (
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <RealtimeRefresher channelName={`home-alertas-${usuario.id}`} subs={subsAlertas} />
        <div className="border-b border-border mb-6">
          <CentralTabNav podeCobranca={podeCobranca} />
        </div>
        <CobrancaDashboard
          kpis={relatorio.kpis}
          statusPedidos={relatorio.statusPedidos}
          statusSolicitacoes={relatorio.statusSolicitacoes}
          pedidosAprovacao={relatorio.pedidosAprovacao}
          solicitacoesAprovacao={relatorio.solicitacoesAprovacao}
          pedidosEmEntrega={relatorio.pedidosEmEntrega}
          pedidosAtrasados={relatorio.pedidosAtrasados}
          alertas={alertas}
        />
      </div>
    );
  }

  const TAREFA_SELECT = `
    id, titulo, status, prioridade, data_limite, setor_id, coluna_id, origem,
    setor:setores(nome),
    coluna:colunas_kanban(nome),
    responsavel:usuarios!usuario_responsavel_id(id, nome),
    etiquetas:tarefa_etiquetas(etiqueta:etiquetas(id, nome, cor, setor_id))
  `;

  const podeAprovarPedido = podeAprovarPedidoTab;
  const podeAprovarSolicitacao = podeAprovarSolicitacaoTab;

  const STATUS_EXCLUIR = '("CONCLUIDA","CANCELADA")';

  const [
    { data: minhasTarefasRaw },
    { data: setorTarefasData },
    { data: pedidosParaAprovarData },
    { data: pedidosAprovadosData },
    { data: pedidosRejeitadosData },
    { data: solicitacoesParaAprovarData },
  ] = await Promise.all([
    // Tarefas onde sou responsável
    admin
      .from("tarefas")
      .select(TAREFA_SELECT)
      .eq("usuario_responsavel_id", usuario.id)
      .is("deleted_at", null)
      .not("status", "in", STATUS_EXCLUIR)
      .order("prioridade", { ascending: false })
      .order("data_limite", { ascending: true, nullsFirst: false }),

    // Tarefas sem dono do meu setor
    usuario.setor?.id
      ? admin
          .from("tarefas")
          .select(TAREFA_SELECT)
          .eq("setor_id", usuario.setor.id)
          .eq("status", "SEM_DONO")
          .is("deleted_at", null)
          .order("prioridade", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),

    // Pedidos aguardando aprovação (para aprovadores de pedido)
    podeAprovarPedido
      ? admin
          .from("pedidos_compra")
          .select("id, numero, tipo_linha, criado_em, fornecedor:fornecedores(nome), obra:obras(nome)")
          .eq("status", "AGUARDANDO_APROVACAO")
          .order("criado_em", { ascending: true })
      : Promise.resolve({ data: [] }),

    // Pedidos aprovados do comprador (para emitir)
    admin
      .from("pedidos_compra")
      .select(PEDIDO_COMPRADOR_SELECT)
      .eq("comprador_id", usuario.id)
      .eq("status", "APROVADO")
      .order("criado_em", { ascending: true }),

    // Pedidos rejeitados do comprador (para revisar)
    admin
      .from("pedidos_compra")
      .select(PEDIDO_COMPRADOR_SELECT)
      .eq("comprador_id", usuario.id)
      .eq("status", "REJEITADO")
      .order("criado_em", { ascending: true }),

    // Solicitações pendentes de aprovação (ABERTA ou AGUARDANDO_APROVACAO)
    podeAprovarSolicitacao
      ? admin
          .from("solicitacoes_compra")
          .select("id, numero, prioridade, obra:obras(nome), solicitante:usuarios!solicitante_id(nome)")
          .in("status", ["ABERTA", "AGUARDANDO_APROVACAO"])
          .order("criado_em", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <>
      <RealtimeRefresher
        channelName={`home-${usuario.id}`}
        subs={[
          { table: "tarefas", filter: `usuario_responsavel_id=eq.${usuario.id}` },
          { table: "pedidos_compra", filter: `comprador_id=eq.${usuario.id}` },
          ...(usuario.setor?.id
            ? [{ table: "tarefas" as const, filter: `setor_id=eq.${usuario.setor.id}`, event: "INSERT" as const }]
            : []),
        ]}
      />
      {podeCobranca && (
        <div className="border-b border-border bg-surface px-5 pt-2">
          <CentralTabNav podeCobranca={podeCobranca} />
        </div>
      )}
      <MinhaCentral
        minhasTarefas={(minhasTarefasRaw ?? []) as any}
        setorTarefas={(setorTarefasData ?? []) as any}
        pedidosParaAprovar={(pedidosParaAprovarData ?? []) as any}
        pedidosAprovados={(pedidosAprovadosData ?? []) as any}
        pedidosRejeitados={(pedidosRejeitadosData ?? []) as any}
        solicitacoesParaAprovar={(solicitacoesParaAprovarData ?? []) as any}
        usuarioId={usuario.id}
        usuarioNome={usuario.nome}
      />
    </>
  );
}
