import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TarefasFilterBar } from "@/components/kanban/tarefas-filter-bar";
import { SyncButton } from "@/components/kanban/sync-button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import type { Tarefa, Coluna, Etiqueta } from "@/types/kanban";

export const dynamic = "force-dynamic";

const COLUNAS_PADRAO_SETOR = [
  { nome: "Sem dono", ordem: 0, tipo: "PADRAO" as const, aceita_automaticas: true },
  { nome: "Aceitas", ordem: 1, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Em andamento", ordem: 2, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Aguardando", ordem: 3, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Concluído", ordem: 4, tipo: "PADRAO" as const, aceita_automaticas: false },
];

interface PageProps {
  searchParams: {
    setor?: string;
    obra_id?: string;
    prioridade?: string;
    etiqueta_id?: string;
    sem_dono?: string;
    minhas?: string;
  };
}

export default async function TarefasPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();
  const isAdmin = usuario.cargo?.is_admin ?? false;

  const setorIdParam = searchParams.setor ?? usuario.setor?.id ?? null;

  const { data: setores } = isAdmin
    ? await admin.from("setores").select("id, nome").order("nome")
    : { data: null };

  let colunas: Coluna[] = [];

  if (setorIdParam) {
    let { data: colunasDb } = await admin
      .from("colunas_kanban")
      .select("*")
      .eq("setor_id", setorIdParam)
      .order("ordem");

    if (!colunasDb || colunasDb.length === 0) {
      const inserir = COLUNAS_PADRAO_SETOR.map((c) => ({
        ...c,
        setor_id: setorIdParam,
        usuario_id: null,
        cor: null,
      }));
      const { data: novas } = await admin
        .from("colunas_kanban")
        .insert(inserir)
        .select("*");
      colunasDb = novas ?? [];
    }

    colunas = (colunasDb ?? []) as Coluna[];
  }

  let query = admin
    .from("tarefas")
    .select(
      `*, responsavel:usuarios!usuario_responsavel_id(id, nome),
       etiquetas:tarefa_etiquetas(etiqueta:etiquetas(id, nome, cor, setor_id))`
    )
    .is("deleted_at", null)
    .order("ordem");

  if (colunas.length > 0) {
    query = query.in("coluna_id", colunas.map((c) => c.id));
  } else if (setorIdParam) {
    query = query.eq("setor_id", setorIdParam);
  } else {
    query = query.eq("setor_id", "00000000-0000-0000-0000-000000000000");
  }

  if (searchParams.obra_id) query = query.eq("obra_id", searchParams.obra_id);
  if (searchParams.prioridade) query = query.eq("prioridade", searchParams.prioridade);
  if (searchParams.sem_dono === "1") query = query.is("usuario_responsavel_id", null);
  if (searchParams.minhas === "1") query = query.eq("usuario_responsavel_id", usuario.id);

  const { data: tarefasRaw } = await query;

  let tarefasFiltradas = tarefasRaw ?? [];

  if (searchParams.etiqueta_id) {
    const { data: tIds } = await admin
      .from("tarefa_etiquetas")
      .select("tarefa_id")
      .eq("etiqueta_id", searchParams.etiqueta_id);
    const idsSet = new Set((tIds ?? []).map((r: any) => r.tarefa_id));
    tarefasFiltradas = tarefasFiltradas.filter((t: any) => idsSet.has(t.id));
  }

  const tarefas: Tarefa[] = tarefasFiltradas.map((t: any) => {
    const etiquetas: Etiqueta[] = (t.etiquetas ?? [])
      .map((te: any) => te.etiqueta)
      .filter(Boolean);
    return {
      ...t,
      etiquetas,
      _checklist_total: undefined,
      _checklist_done: undefined,
      _tem_arquivos: false,
      _tem_links: false,
    };
  });

  // Oculta colunas sem nenhuma tarefa para deixar o fluxo mais limpo
  const colunasComTarefas = new Set(tarefas.map((t: any) => t.coluna_id));
  const colunasVisiveis = colunas.filter((c) => colunasComTarefas.has(c.id));

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-line bg-surface">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Tarefas do Setor</h1>
          {setorIdParam && (
            <p className="text-xs text-ink-faint mt-0.5">
              {colunasVisiveis.length} colunas · {tarefas.length} tarefas
            </p>
          )}
        </div>

        <TarefasFilterBar
          setores={isAdmin ? (setores as any) : null}
          setorAtual={setorIdParam}
        />
        {isAdmin && <SyncButton />}
        {/* INSERT de nova tarefa dispara refresh (substitui o router.refresh() inline do kanban-board) */}
        <RealtimeRefresher
          channelName={`tarefas-page-${setorIdParam ?? "all"}`}
          subs={[
            setorIdParam
              ? { table: "tarefas", event: "INSERT", filter: `setor_id=eq.${setorIdParam}` }
              : { table: "tarefas", event: "INSERT" },
          ]}
        />
      </div>

      <div className="px-4 py-4 overflow-x-auto">
        {colunas.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-ink-faint text-sm">
            {setorIdParam
              ? "Nenhuma coluna encontrada para este setor."
              : "Selecione um setor para ver as tarefas."}
          </div>
        ) : (
          <KanbanBoard
            colunas={colunasVisiveis}
            tarefas={tarefas}
            modo="setor"
            usuarioId={usuario.id}
            setorId={setorIdParam}
          />
        )}
      </div>
    </div>
  );
}
