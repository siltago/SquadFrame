"use client";

import { cn } from "@/ui/lib/cn";
import { CalendarIcon, CheckSquareIcon } from "@/ui/icons";
import type { InternalBoardCard } from "@/modules/squadboard/types/internal-board";

function Avatar({ nome, avatar }: { nome: string; avatar?: string }) {
  if (avatar) return <img src={avatar + "/30.png"} className="h-5 w-5 rounded-full object-cover" alt={nome} />;
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isPast(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export function InternalCard({
  card,
  onClick,
}: {
  card: InternalBoardCard;
  onClick: () => void;
}) {
  const dateStr = formatDate(card.prazo);
  const overdue = isPast(card.prazo);
  const hasChecklists = card.checklists.length > 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-border bg-surface p-3.5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-[120ms]"
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {card.labels.map((l) => (
            <span
              key={l.id}
              title={l.nome}
              className="h-[6px] w-9 rounded-full shrink-0"
              style={{ backgroundColor: l.cor }}
            />
          ))}
        </div>
      )}

      {/* Título */}
      <p className="text-sm font-medium leading-snug text-text group-hover:text-primary transition-colors">
        {card.titulo}
      </p>

      {/* Rodapé */}
      {(dateStr || hasChecklists || card.responsaveis.length > 0) && (
        <div className="mt-2.5 flex items-center gap-2.5">
          {/* Progresso */}
          {hasChecklists && (
            <span className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              card.progresso === 100 ? "text-green-500" : "text-text-3",
            )}>
              <CheckSquareIcon size={11} />
              {card.progresso}%
            </span>
          )}

          {/* Prazo */}
          {dateStr && (
            <span className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              overdue ? "text-danger" : "text-text-3",
            )}>
              <CalendarIcon size={11} />
              {dateStr}
            </span>
          )}

          {/* Avatares */}
          {card.responsaveis.length > 0 && (
            <div className="ml-auto flex -space-x-1.5">
              {card.responsaveis.slice(0, 3).map((m) => (
                <Avatar key={m.id} nome={m.nome} avatar={m.avatar} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
