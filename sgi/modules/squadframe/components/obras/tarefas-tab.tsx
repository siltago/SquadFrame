import { createAdminClient } from "@/shared/database/supabase-admin";
import Link from "next/link";
import { PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/modules/squadframe/types/kanban";
import { Button } from "@/ui/components/Button";

const STATUS_LABEL: Record<string, string> = {
  SEM_DONO:     "Sem dono",
  ACEITA:       "Aceita",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO:   "Aguardando",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
};

const STATUS_COR: Record<string, string> = {
  SEM_DONO:     "#94a3b8",
  ACEITA:       "#3b82f6",
  EM_ANDAMENTO: "#f59e0b",
  AGUARDANDO:   "#8b5cf6",
  CONCLUIDA:    "#10b981",
  CANCELADA:    "#ef4444",
};

export async function TarefasTab({ obraId }: { obraId: string }) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("tarefas")
    .select("id, titulo, status, prioridade, data_limite, criado_em, responsavel:usuarios!usuario_responsavel_id(nome)")
    .eq("obra_id", obraId)
    .is("deleted_at", null)
    .not("status", "in", "(CONCLUIDA,CANCELADA)")
    .order("data_limite", { ascending: true, nullsFirst: false });

  const tarefas = (data ?? []) as unknown as Array<{
    id: string; titulo: string; status: string; prioridade: string;
    data_limite: string | null; criado_em: string;
    responsavel: { nome: string } | null;
  }>;

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-2">
          Tarefas vinculadas a esta obra.{" "}
          <span className="text-text-3">Clique em uma tarefa para abrir no módulo de Tarefas.</span>
        </p>
        <Link href="/squadframe/tarefas" className="text-sm text-primary hover:underline">
          Abrir kanban completo →
        </Link>
      </div>

      {tarefas.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-text">Nenhuma tarefa ativa para esta obra</p>
          <p className="text-xs text-text-3">Crie tarefas no kanban e vincule a esta obra.</p>
          <Button as="a" href="/squadframe/tarefas" className="mt-2 text-sm">Ir para Tarefas</Button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-5 py-3 font-medium">Tarefa</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3 font-medium">Responsável</th>
                <th className="px-5 py-3 font-medium">Prazo</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {tarefas.map((t) => {
                const sCor    = STATUS_COR[t.status] ?? "#94a3b8";
                const pCor    = PRIORIDADE_COR[t.prioridade as keyof typeof PRIORIDADE_COR] ?? "#94a3b8";
                const vencida = t.data_limite && new Date(t.data_limite) < hoje;
                return (
                  <tr key={t.id} className={`border-b border-border last:border-0 transition-colors hover:bg-bg ${vencida ? "bg-danger-soft/40" : ""}`}>
                    <td className="px-5 py-3 font-medium text-text max-w-xs">
                      <Link href={`/squadframe/tarefas?tarefa=${t.id}`} className="hover:underline truncate block">
                        {t.titulo}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: sCor + "20", color: sCor }}
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: pCor }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pCor }} />
                        {PRIORIDADE_LABEL[t.prioridade as keyof typeof PRIORIDADE_LABEL] ?? t.prioridade}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-2">
                      {t.responsavel?.nome ?? <span className="text-text-3">—</span>}
                    </td>
                    <td className={`px-5 py-3 text-xs font-medium ${vencida ? "text-danger" : "text-text-3"}`}>
                      {t.data_limite ? new Date(t.data_limite).toLocaleDateString("pt-BR") : "—"}
                      {vencida && " ⚠"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/squadframe/tarefas?tarefa=${t.id}`} className="text-xs text-primary hover:underline">
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
