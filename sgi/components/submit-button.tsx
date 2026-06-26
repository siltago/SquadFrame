"use client";

import { useFormStatus } from "react-dom";

interface Props {
  label?: string;
  pendingLabel?: string;
  className?: string;
}

export function SubmitButton({
  label = "Salvar",
  pendingLabel = "Salvando…",
  className = "btn-primary",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
