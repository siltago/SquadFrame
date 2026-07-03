"use client";

import { cn } from "@/ui/lib/cn";

export interface PipelineStep {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface PipelineStepperProps {
  steps: PipelineStep[];
  activeId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PipelineStepper({
  steps, activeId, onChange, disabled, className,
}: PipelineStepperProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border-b border-border bg-surface px-4 pt-1.5 sm:px-6",
        className
      )}
    >
      {steps.map((step) => {
        const active = step.id === activeId;
        return (
          <button
            key={step.id}
            onClick={() => onChange(step.id)}
            disabled={disabled}
            className={cn(
              "relative flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-sm font-semibold",
              "transition-colors duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full",
              "after:transition-colors after:duration-[120ms]",
              active
                ? "text-primary after:bg-primary"
                : "text-text-3 hover:text-text-2 after:bg-transparent"
            )}
          >
            {step.icon && <span className="shrink-0">{step.icon}</span>}
            {step.label}
            {step.badge !== undefined && (
              <span className={cn(
                "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1",
                "text-[10px] font-bold",
                active ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-3"
              )}>
                {step.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
