"use client";

import { NoteIcon, CheckSquareIcon, AttachmentIcon } from "@/ui/icons";

function BarBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-3 transition-colors hover:bg-surface-3 hover:text-text"
    >
      {icon}
      {label}
    </button>
  );
}

export function ContentBar({
  onDescricao,
  onChecklist,
  onAnexo,
}: {
  onDescricao: () => void;
  onChecklist: () => void;
  onAnexo: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border px-5 py-1.5">
      <BarBtn icon={<NoteIcon size={13} />} label="Descrição" onClick={onDescricao} />
      <BarBtn icon={<CheckSquareIcon size={13} />} label="Checklist" onClick={onChecklist} />
      <BarBtn icon={<AttachmentIcon size={13} />} label="Anexo" onClick={onAnexo} />
    </div>
  );
}
