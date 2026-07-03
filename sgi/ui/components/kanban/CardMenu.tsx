"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/ui/lib/cn";
import { MoreHorizontalIcon } from "@/ui/icons";

export interface CardMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface CardMenuProps {
  items: CardMenuItem[];
  className?: string;
}

export function CardMenu({ items, className }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded",
          "text-text-3 opacity-0 transition-all duration-[120ms]",
          "group-hover:opacity-100 hover:bg-surface-2 hover:text-text-2",
          open && "opacity-100 bg-surface-2 text-text-2"
        )}
        aria-label="Ações"
      >
        <MoreHorizontalIcon size={14} />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full z-40 mt-1 min-w-[160px]",
          "rounded-md border border-border bg-surface shadow-md",
          "py-1"
        )}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                "transition-colors duration-[120ms] disabled:opacity-50",
                item.variant === "danger"
                  ? "text-danger hover:bg-danger/10"
                  : "text-text-2 hover:bg-surface-2 hover:text-text"
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
