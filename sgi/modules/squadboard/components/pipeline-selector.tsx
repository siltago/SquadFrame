"use client";

import { PipelineStepper } from "@/ui/components/kanban";
import { PIPELINES, type PipelineId } from "@/modules/squadboard/types/pipeline";

export function PipelineSelector({
  pipeline, onChange, disabled,
}: {
  pipeline: PipelineId;
  onChange: (pipeline: PipelineId) => void;
  disabled?: boolean;
}) {
  const steps = PIPELINES.map((p) => ({ id: p.id, label: p.nome }));

  return (
    <PipelineStepper
      steps={steps}
      activeId={pipeline}
      onChange={(id) => onChange(id as PipelineId)}
      disabled={disabled}
    />
  );
}
