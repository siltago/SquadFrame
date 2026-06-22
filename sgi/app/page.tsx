import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { KanbanCollapsible } from "@/components/kanban/kanban-collapsible";
import type { Tarefa, Coluna, Etiqueta } from "@/types/kanban";

export const dynamic = "force-dynamic";

const COLUNAS_PADRAO = [
  { nome: "Sem dono", ordem: 0, tipo: "PADRAO" as const, aceita_automaticas: true },
  { nome: "Aceitas", ordem: 1, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Em andamento", ordem: 2, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Aguardando", ordem: 3, tipo: "PADRAO" as const, aceita_automaticas: false },
  { nome: "Concluído", ordem: 4, tipo: "PADRAO" as const, aceita_automaticas: false },
];

export default async function HomePage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();

  let { data: colunas } = await admin
    .from("colunas_kanban")
    .select("*")
    .eq("usuario_id", usuario.id)
    .order("ordem");

  if (!colunas || colunas.length === 0) {
    const inserir = COLUNAS_PADRAO.map((c) => ({ ...c, usuario_id: usuario.id, setor_id: null, cor: null }));
    const { data: novas } = await admin
      .from("colunas_kanban")
      .insert(inserir)
      .select("*");
    colunas = novas ?? [];
  }

  const { data: tarefasRaw } = await admin
    .from("tarefas")
    .select(
      `*, responsavel:usuarios!usuario_responsavel_id(id, nome),
       etiquetas:tarefa_etiquetas(etiqueta:etiquetas(id, nome, cor, setor_id))`
    )
    .in("coluna_id", (colunas ?? []).map((c: any) => c.id))
    .is("deleted_at", null)
    .order("ordem");

  const tarefas: Tarefa[] = (tarefasRaw ?? []).map((t: any) => {
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

  return (
    <KanbanCollapsible
      colunas={(colunas ?? []) as Coluna[]}
      tarefas={tarefas}
      usuarioId={usuario.id}
      usuarioNome={usuario.nome}
    />
  );
}
