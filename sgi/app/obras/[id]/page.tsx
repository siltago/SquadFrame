import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { BtnAcaoProtegida } from "@/components/btn-acao-protegida";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { StatusObraSelector } from "./status-selector";
import { AbaProducao } from "./aba-producao";
import { DashboardTab } from "./dashboard-tab";
import { WorkspaceTab } from "./workspace-tab";
import { TimelineTab } from "./timeline-tab";
import { ConfigTab } from "./config-tab";

export const dynamic = "force-dynamic";

const ABAS = [
  { label: "Dashboard",    slug: "dashboard"  },
  { label: "Workspace",    slug: "workspace"  },
  { label: "Produção",     slug: "producao"   },
  { label: "Timeline",     slug: "timeline"   },
  { label: "Configuração", slug: "config"     },
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
      <BackButton href="/obras" />

      {/* Cabeçalho */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {obraNumero && (
              <span className="font-mono text-sm font-bold text-steel">{obraNumero}</span>
            )}
            {obra.codigo && (
              <span className="font-mono text-xs font-medium text-ink-faint">{obra.codigo}</span>
            )}
            {obra.status && (
              <StatusObraSelector
                obraId={params.id}
                statusAtual={{ id: obra.status_id, nome: obra.status.nome, cor: obra.status.cor }}
              />
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{obra.nome}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {obra.cliente?.nome}
            {obra.cidade ? ` · ${obra.cidade}${obra.estado ? `/${obra.estado}` : ""}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BtnAcaoProtegida
            href={`/obras/${params.id}/editar`}
            label="Editar"
            temPermissao={podeEditar}
            acao="editar obras"
            className="btn-ghost text-sm"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {ABAS.map(({ label, slug }) => {
          const isActive = aba === slug || (slug === "workspace" && aba === "workspace");
          return (
            <Link
              key={slug}
              href={`/obras/${params.id}?aba=${slug}`}
              className={
                isActive
                  ? "shrink-0 border-b-2 border-steel px-4 py-2.5 text-sm font-semibold text-ink"
                  : "shrink-0 px-4 py-2.5 text-sm font-medium text-ink-faint hover:text-ink-soft"
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
  type Lote = { id: string; nome: string; criado_em: string; tipologias: Tipologia[] };

  let lotes: Lote[] = [];
  let semLote: Array<{ id: string; nome: string; quantidade: number }> = [];
  let migracaoPendente = false;

  const [resLotes, resSemLote] = await Promise.all([
    supabase
      .from("lotes_obra")
      .select("id, nome, criado_em, tipologias:tipologias_obra(id, nome, quantidade, status, codigo_esquadria, tipo, largura_mm, altura_mm, tratamento, descricao, peso_unit, preco_unit)")
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
    lotes = (resLotes.data ?? []) as Lote[];
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

  return <AbaProducao obraId={obraId} lotes={lotes} semLote={semLote} migracaoPendente={migracaoPendente} />;
}
