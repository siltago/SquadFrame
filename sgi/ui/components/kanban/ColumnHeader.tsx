import { cn } from "@/ui/lib/cn";
import { PlusIcon } from "@/ui/icons";
import type { CardMenuItem } from "./CardMenu";
import { CardMenu } from "./CardMenu";

interface ColumnHeaderProps {
  title: string;
  count?: number;
  onAdd?: () => void;
  menuItems?: CardMenuItem[];
  accent?: string;
  className?: string;
}

export function ColumnHeader({
  title, count, onAdd, menuItems, accent, className,
}: ColumnHeaderProps) {
  return (
    <div className={cn("group mb-2.5 flex items-center gap-2 px-1", className)}>
      {accent && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      )}

      <h3 className="flex-1 truncate text-sm font-semibold text-text">{title}</h3>

      {count !== undefined && (
        <span className="min-w-[18px] rounded-full bg-surface-3 px-1.5 py-px text-center text-[11px] font-semibold text-text-3">
          {count}
        </span>
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded",
            "text-text-3 opacity-0 transition-all duration-[120ms]",
            "group-hover:opacity-100 hover:bg-surface-2 hover:text-text"
          )}
          aria-label={`Adicionar em ${title}`}
        >
          <PlusIcon size={12} />
        </button>
      )}

      {menuItems && menuItems.length > 0 && (
        <CardMenu items={menuItems} />
      )}
    </div>
  );
}
