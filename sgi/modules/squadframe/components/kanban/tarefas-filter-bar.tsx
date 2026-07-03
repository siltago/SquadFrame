"use client";

import { useSearchParams, useRouter } from "next/navigation";

interface Props {
  setores?: { id: string; nome: string }[] | null;
  setorAtual: string | null;
}

const prioridades = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const prioridadeLabel: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export function TarefasFilterBar({ setores, setorAtual }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/squadframe/tarefas?${params.toString()}`);
  }

  const semDono = searchParams.get("sem_dono") === "1";
  const minhas = searchParams.get("minhas") === "1";
  const prioridadeAtual = searchParams.get("prioridade") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2 ml-auto">
      {setores && (
        <select
          value={setorAtual ?? ""}
          onChange={(e) => setParam("setor", e.target.value || null)}
          className="field text-sm py-1.5 w-auto"
        >
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      )}

      <button
        onClick={() => setParam("sem_dono", semDono ? null : "1")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
          semDono
            ? "bg-primary text-white border-primary"
            : "bg-surface text-text-2 border-border hover:bg-bg"
        }`}
      >
        Sem dono
      </button>

      <button
        onClick={() => setParam("minhas", minhas ? null : "1")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
          minhas
            ? "bg-primary text-white border-primary"
            : "bg-surface text-text-2 border-border hover:bg-bg"
        }`}
      >
        Minhas
      </button>

      <select
        value={prioridadeAtual}
        onChange={(e) => setParam("prioridade", e.target.value || null)}
        className="field text-xs py-1.5 w-auto"
      >
        <option value="">Toda prioridade</option>
        {prioridades.map((p) => (
          <option key={p} value={p}>{prioridadeLabel[p]}</option>
        ))}
      </select>
    </div>
  );
}
