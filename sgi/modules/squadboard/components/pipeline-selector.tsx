"use client";

import { cn } from "@/ui/lib/cn";
import { PIPELINES, type PipelineId } from "@/modules/squadboard/types/pipeline";

// Substitui as colunas por status calculado (Fase 4) por um seletor de
// Pipeline — trocar de pipeline troca as colunas do board inteiro, mas o
// conjunto de Pacotes é sempre o mesmo (cada um pode estar em colunas
// diferentes em cada pipeline).
export function PipelineSelector({
  pipeline, onChange, disabled,
}: {
  pipeline: PipelineId;
  onChange: (pipeline: PipelineId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-surface px-4 pt-2 sm:px-6">
      {PIPELINES.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          disabled={disabled}
          className={cn(
            "rounded-t-lg px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-[120ms] disabled:opacity-50",
            pipeline === p.id
              ? "border-primary text-primary"
              : "border-transparent text-text-3 hover:text-text-2"
          )}
        >
          {p.nome}
        </button>
      ))}
    </div>
  );
}
