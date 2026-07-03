"use client";

import { useMemo } from "react";
import type { BoardWorkPackageCard, PrioridadePacote } from "@/modules/squadboard/types/work-package";
import { colunasDoPipeline, type PipelineId } from "@/modules/squadboard/types/pipeline";
import { FILTROS_VAZIOS, temFiltroAtivo, type FiltrosBoard } from "@/modules/squadboard/utils/filtrar-pacotes";

const PRIORIDADE_LABEL: Record<PrioridadePacote, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

export function FiltrosBoardBar({
  pacotes, pipeline, filtros, onChange,
}: {
  pacotes: BoardWorkPackageCard[];
  pipeline: PipelineId;
  filtros: FiltrosBoard;
  onChange: (filtros: FiltrosBoard) => void;
}) {
  const obras = useMemo(() => {
    const map = new Map<string, string>();
    pacotes.forEach((p) => { if (p.obraId) map.set(p.obraId, p.obraNome); });
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pacotes]);

  const responsaveis = useMemo(() => {
    const map = new Map<string, string>();
    pacotes.forEach((p) => { if (p.responsavelId && p.responsavel) map.set(p.responsavelId, p.responsavel); });
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pacotes]);

  const colunas = colunasDoPipeline(pipeline);

  function set<K extends keyof FiltrosBoard>(key: K, value: FiltrosBoard[K]) {
    onChange({ ...filtros, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5 sm:px-6">
      <input
        value={filtros.busca}
        onChange={(e) => set("busca", e.target.value)}
        placeholder="Buscar pacote…"
        className="field h-8 w-full max-w-[200px] text-sm"
      />

      <select value={filtros.obraId} onChange={(e) => set("obraId", e.target.value)} className="field h-8 w-auto text-sm">
        <option value="">Todas as obras</option>
        {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      <select value={filtros.responsavelId} onChange={(e) => set("responsavelId", e.target.value)} className="field h-8 w-auto text-sm">
        <option value="">Todos os responsáveis</option>
        {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
      </select>

      <select value={filtros.prioridade} onChange={(e) => set("prioridade", e.target.value)} className="field h-8 w-auto text-sm">
        <option value="">Todas as prioridades</option>
        {(Object.keys(PRIORIDADE_LABEL) as PrioridadePacote[]).map((p) => (
          <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
        ))}
      </select>

      <select value={filtros.coluna} onChange={(e) => set("coluna", e.target.value)} className="field h-8 w-auto text-sm">
        <option value="">Todas as colunas</option>
        {colunas.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select
        value={filtros.prazo}
        onChange={(e) => set("prazo", e.target.value as FiltrosBoard["prazo"])}
        className="field h-8 w-auto text-sm"
      >
        <option value="todos">Qualquer prazo</option>
        <option value="atrasados">Atrasados</option>
        <option value="sem_prazo">Sem prazo</option>
      </select>

      {temFiltroAtivo(filtros) && (
        <button
          onClick={() => onChange(FILTROS_VAZIOS)}
          className="text-xs font-medium text-primary hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
