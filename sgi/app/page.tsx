import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { MinhaCentral } from "@/components/kanban/minha-central";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export const dynamic = "force-dynamic";

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

  const STATUS_EXCLUIR = '("CONCLUIDA","CANCELADA")';

  // Tarefas onde sou responsável
  const { data: minhasTarefasRaw } = await admin
    .from("tarefas")
    .select(TAREFA_SELECT)
    .eq("usuario_responsavel_id", usuario.id)
    .is("deleted_at", null)
    .not("status", "in", STATUS_EXCLUIR)
    .order("prioridade", { ascending: false })
    .order("data_limite", { ascending: true, nullsFirst: false });

  // Tarefas sem dono do meu setor (para facilitar aceitar)
  let setorTarefasRaw: any[] = [];
  if (usuario.setor?.id) {
    const { data } = await admin
      .from("tarefas")
      .select(TAREFA_SELECT)
      .eq("setor_id", usuario.setor.id)
      .eq("status", "SEM_DONO")
      .is("deleted_at", null)
      .order("prioridade", { ascending: false })
      .limit(20);
    setorTarefasRaw = data ?? [];
  }

  return (
    <>
      <RealtimeRefresher
        channelName={`home-${usuario.id}`}
        subs={[
          { table: "tarefas", filter: `usuario_responsavel_id=eq.${usuario.id}` },
          ...(usuario.setor?.id
            ? [{ table: "tarefas" as const, filter: `setor_id=eq.${usuario.setor.id}`, event: "INSERT" as const }]
            : []),
        ]}
      />
      <MinhaCentral
        minhasTarefas={(minhasTarefasRaw ?? []) as any}
        setorTarefas={setorTarefasRaw as any}
        usuarioId={usuario.id}
        usuarioNome={usuario.nome}
      />
    </>
  );
}
