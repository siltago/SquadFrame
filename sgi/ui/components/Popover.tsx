"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/ui/lib/cn";

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  width?: string;
  className?: string;
}

const sideStyles = {
  top:    "bottom-full mb-2",
  bottom: "top-full mt-2",
};

const alignStyles = {
  start:  "left-0",
  center: "left-1/2 -translate-x-1/2",
  end:    "right-0",
};

/**
 * Popover — overlay posicionado ancorado a um trigger, para conteúdo livre
 * (não é um menu de ações — pra isso use Dropdown).
 */
export function Popover({
  trigger, children, open: openProp, onOpenChange,
  side = "bottom", align = "start", width = "260px", className,
}: PopoverProps) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const ref = useRef<HTMLDivElement>(null);

  function setOpen(v: boolean) {
    if (!isControlled) setOpenState(v);
    onOpenChange?.(v);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
            sideStyles[side],
            alignStyles[align]
          )}
          style={{ width, animation: "squadPopoverIn var(--motion-hover) var(--ease-out) both" }}
        >
          {children}
        </div>
      )}
      <style>{`
        @keyframes squadPopoverIn {
          from { opacity: 0; transform: scale(0.97) translateY(2px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
