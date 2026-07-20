import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { BtnAcaoProtegida } from "@/modules/squadframe/components/btn-acao-protegida";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";
import { StatusObraSelector } from "@/modules/squadframe/components/obras/status-selector";
import { AbaProducao } from "@/modules/squadframe/components/obras/aba-producao";
import { DashboardTab } from "@/modules/squadframe/components/obras/dashboard-tab";
import { WorkspaceTab } from "@/modules/squadframe/components/obras/workspace-tab";
import { TimelineTab } from "@/modules/squadframe/components/obras/timeline-tab";
import { ConfigTab } from "@/modules/squadframe/components/obras/config-tab";
import { FinanceiroTab } from "@/modules/squadframe/components/obras/financeiro-tab";

export const dynamic = "force-dynamic";

const ABAS = [
  { label: "Dashboard",    slug: "dashboard"   },
  { label: "Workspace",    slug: "workspace"   },
  { label: "Produção",     slug: "producao"    },
  { label: "Timeline",     slug: "timeline"    },
  { label: "Financeiro",   slug: "financeiro"  },
  { label: "Configuração", slug: "config"      },
] as const;

type AbaSlug = typeof ABAS[number]["slug"];

export default async function ObraPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { aba?: string; filtro?: string };
}) {
  const aba    = (searchParams.aba ?? "dashboard") as AbaSlug;
  const filtro = searchParams.filtro;

  const supabase = createAdminClient();
  const usuario  = await getUsuarioAtual();

  const podeEditar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("obras.editar") ||
    false;

  type ObraDetalhes = {
    id: string; numero: number | null; codigo: string | null; nome: string;
    endereco: string | null; cidade: string | null; estado: string | null; cep: string | null;
    data_prevista: string | null; observacoes: string | null; status_id: string;
    cliente: { nome: string | null; documento: string | null } | null;
    status: { nome: string; cor: string } | null;
  };

  const { data: obraRaw } = await supabase
    .from("obras")
    .select(`
      id, numero, codigo, nome, endereco, cidade, estado, cep,
      data_prevista, observacoes, status_id,
      cliente:clientes(nome, documento),
      status:obra_status(nome, cor)
    `)
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  const obra = obraRaw as unknown as ObraDetalhes | null;
  if (!obra) notFound();

  const obraNumero = obra.numero ? String(obra.numero).padStart(4, "0") : null;

  return (
    <div className="px-8 py-8">
      <BackButton href="/squadframe/obras" />

      {/* Cabeçalho */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {obraNumero && (
              <span className="font-mono text-sm font-bold text-primary">{obraNumero}</span>
            )}
            {obra.codigo && (
              <span className="font-mono text-xs font-medium text-text-3">{obra.codigo}</span>
            )}
            {obra.status && (
              <StatusObraSelector
                obraId={params.id}
                statusAtual={{ id: obra.status_id, nome: obra.status.nome, cor: obra.status.cor }}
              />
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{obra.nome}</h1>
          <p className="mt-1 text-sm text-text-2">
            {obra.cliente?.nome}
            {obra.cidade ? ` · ${obra.cidade}${obra.estado ? `/${obra.estado}` : ""}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BtnAcaoProtegida
            href={`/squadframe/obras/${params.id}/editar`}
            label="Editar"
            temPermissao={podeEditar}
            acao="editar obras"
            variant="ghost" className="text-sm"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {ABAS.map(({ label, slug }) => {
          const isActive = aba === slug || (slug === "workspace" && aba === "workspace");
          return (
            <Link
              key={slug}
              href={`/squadframe/obras/${params.id}?aba=${slug}`}
              className={
                isActive
                  ? "shrink-0 border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-text"
                  : "shrink-0 px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Realtime: qualquer mudança nesta obra atualiza automaticamente */}
      <RealtimeRefresher
        channelName={`obra-${params.id}`}
        subs={[
          { table: "pedidos_compra",    filter: `obra_id=eq.${params.id}` },
          { table: "solicitacoes_compra", filter: `obra_id=eq.${params.id}` },
          { table: "tarefas",           filter: `obra_id=eq.${params.id}` },
          { table: "lotes_obra",        filter: `obra_id=eq.${params.id}` },
          { table: "tipologias_obra" },
        ]}
      />

      {/* Conteúdo por aba */}
      {aba === "dashboard" && (
        <DashboardTab obraId={params.id} dataPrevista={obra.data_prevista ?? null} />
      )}

      {aba === "workspace" && (
        <WorkspaceTab obraId={params.id} filtro={filtro} />
      )}

      {aba === "producao" && (
        <AbaProducaoWrapper obraId={params.id} supabase={supabase} />
      )}

      {aba === "timeline" && (
        <TimelineTab obraId={params.id} />
      )}

      {aba === "financeiro" && (
        <FinanceiroTab obraId={params.id} />
      )}

      {aba === "config" && (
        <ConfigTab
          obraId={params.id}
          obra={{
            cliente:       obra.cliente,
            endereco:      obra.endereco,
            cidade:        obra.cidade,
            estado:        obra.estado,
            cep:           obra.cep,
            data_prevista: obra.data_prevista,
            observacoes:   obra.observacoes,
          }}
          podeEditar={podeEditar}
        />
      )}
    </div>
  );
}

// Wrapper interno para AbaProducao — preserva lógica existente sem alteração
async function AbaProducaoWrapper({
  obraId,
  supabase,
}: {
  obraId: string;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  type Tipologia = {
    id: string; nome: string; quantidade: number; status?: string | null;
    codigo_esquadria?: string | null; tipo?: string | null;
    largura_mm?: number | null; altura_mm?: number | null;
    tratamento?: string | null; descricao?: string | null;
    peso_unit?: number | null; preco_unit?: number | null;
  };
  type SolicitacaoResumo = {
    id: string; numero: string; status: string; prioridade: string; criado_em: string;
    solicitante?: { nome: string } | null;
  };
  type PedidoResumo = {
    id: string; numero: string; status: string; criado_em: string; valor_final?: number | null;
    valor_itens?: number | null;
    fornecedor?: { nome: string } | null; comprador?: { nome: string } | null;
  };
  type Lote = {
    id: string; nome: string; criado_em: string;
    descricao?: string | null; prioridade?: string | null; prazo?: string | null;
    responsavel_id?: string | null; responsavel?: { nome: string } | null;
    tipologias: Tipologia[];
    solicitacoes: SolicitacaoResumo[];
    pedidos: PedidoResumo[];
  };
  // O PostgREST não expõe pro TS a cardinalidade real do join — para uma FK
  // simples (responsavel_id) ele sempre volta 1 objeto, mas o tipo inferido
  // é array. *Raw modela o shape real da resposta pra normalizar sem `any`.
  type LoteRaw = Omit<Lote, "responsavel" | "solicitacoes" | "pedidos"> & { responsavel: { nome: string }[] | null };
  type SolicitacaoRaw = Omit<SolicitacaoResumo, "solicitante"> & { lote_id: string | null; solicitante: { nome: string }[] | null };
  type PedidoRaw = Omit<PedidoResumo, "fornecedor" | "comprador"> & {
    lote_id: string | null; fornecedor: { nome: string }[] | null; comprador: { nome: string }[] | null;
  };

  let lotes: Lote[] = [];
  let semLote: Array<{ id: string; nome: string; quantidade: number }> = [];
  let migracaoPendente = false;

  const [resLotes, resSemLote] = await Promise.all([
    supabase
      .from("lotes_obra")
      .select("id, nome, criado_em, descricao, prioridade, prazo, responsavel_id, responsavel:usuarios(nome), tipologias:tipologias_obra!tipologias_obra_lote_id_fkey(id, nome, quantidade, status, codigo_esquadria, tipo, largura_mm, altura_mm, tratamento, descricao, peso_unit, preco_unit)")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: true }),
    supabase
      .from("tipologias_obra")
      .select("id, nome, quantidade")
      .eq("obra_id", obraId)
      .is("lote_id", null)
      .order("criado_em", { ascending: true }),
  ]);

  if (resLotes.error) {
    migracaoPendente = true;
  } else {
    const raw = (resLotes.data ?? []) as unknown as LoteRaw[];
    const loteIds = raw.map((l) => l.id);

    // Solicitações/pedidos vinculados a algum Pacote de Trabalho desta obra
    // (Fase 3 — rastreabilidade Produção → Compras). lote_id é opcional, então
    // isso não afeta solicitações/pedidos criados pelo fluxo normal de Compras.
    const [resSolicitacoes, resPedidos] = loteIds.length > 0
      ? await Promise.all([
          supabase
            .from("solicitacoes_compra")
            .select("id, numero, status, prioridade, criado_em, lote_id, solicitante:usuarios(nome)")
            .in("lote_id", loteIds)
            .order("criado_em", { ascending: false }),
          supabase
            .from("pedidos_compra")
            .select("id, numero, status, criado_em, valor_final, lote_id, fornecedor:fornecedores(nome), comprador:usuarios(nome)")
            .in("lote_id", loteIds)
            .order("criado_em", { ascending: false }),
        ])
      : [{ data: [] as SolicitacaoRaw[] }, { data: [] as PedidoRaw[] }];

    const solicitacoesRaw = (resSolicitacoes.data ?? []) as unknown as SolicitacaoRaw[];
    const pedidosRaw = (resPedidos.data ?? []) as unknown as PedidoRaw[];

    // Valor final só é preenchido depois que o pedido chega em Aguardando
    // Recebimento; enquanto isso, o "valor" do pedido pra fins de totalização
    // do lote é a soma dos itens (quantidade_pedida × preco_unitario).
    const pedidoIds = pedidosRaw.map((p) => p.id);
    const valorItensPorPedido = new Map<string, number>();
    if (pedidoIds.length > 0) {
      const { data: itens } = await supabase
        .from("pedido_itens")
        .select("pedido_id, quantidade_pedida, preco_unitario")
        .in("pedido_id", pedidoIds);
      for (const it of itens ?? []) {
        const atual = valorItensPorPedido.get(it.pedido_id) ?? 0;
        valorItensPorPedido.set(it.pedido_id, atual + Number(it.quantidade_pedida) * Number(it.preco_unitario ?? 0));
      }
    }

    lotes = raw.map((l) => ({
      ...l,
      responsavel: l.responsavel?.[0] ?? null,
      solicitacoes: solicitacoesRaw
        .filter((s) => s.lote_id === l.id)
        .map((s) => ({ ...s, solicitante: s.solicitante?.[0] ?? null })),
      pedidos: pedidosRaw
        .filter((p) => p.lote_id === l.id)
        .map((p) => ({
          ...p,
          fornecedor: p.fornecedor?.[0] ?? null,
          comprador: p.comprador?.[0] ?? null,
          valor_itens: valorItensPorPedido.get(p.id) ?? null,
        })),
    }));
  }

  if (resSemLote.error) {
    const { data } = await supabase
      .from("tipologias_obra")
      .select("id, nome, quantidade")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: true });
    semLote = data ?? [];
  } else {
    semLote = resSemLote.data ?? [];
  }

  return (
    <AbaProducao
      obraId={obraId}
      lotes={lotes}
      semLote={semLote}
      migracaoPendente={migracaoPendente}
    />
  );
}
