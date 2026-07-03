import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { MinhaCentral } from "@/modules/squadframe/components/kanban/minha-central";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const PEDIDO_COMPRADOR_SELECT = "id, numero, tipo_linha, fornecedor:fornecedores(nome), obra:obras(nome)";

export default async function HomePage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();

  const TAREFA_SELECT = `
    id, titulo, status, prioridade, data_limite, setor_id, coluna_id, origem,
    setor:setores(nome),
    coluna:colunas_kanban(nome),
    responsavel:usuarios!usuario_responsavel_id(id, nome),
    etiquetas:tarefa_etiquetas(etiqueta:etiquetas(id, nome, cor, setor_id))
  `;

  const podeAprovarPedido =
    usuario.permissoes?.includes("*") ||
    usuario.permissoes?.includes("compras.pedido.aprovar") ||
    false;

  const podeAprovarSolicitacao =
    usuario.permissoes?.includes("*") ||
    usuario.permissoes?.includes("compras.solicitacao.aprovar") ||
    false;

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
