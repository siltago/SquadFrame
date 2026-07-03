import { cn } from "@/ui/lib/cn";

interface DragHandleProps {
  className?: string;
  size?: "sm" | "md";
}

export function DragHandle({ className, size = "md" }: DragHandleProps) {
  const gap = size === "sm" ? "gap-[3px]" : "gap-1";
  const dotSize = size === "sm" ? "h-[3px] w-[3px]" : "h-1 w-1";

  return (
    <span
      className={cn(
        "inline-flex cursor-grab flex-col items-center active:cursor-grabbing",
        gap,
        "text-text-3 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100",
        className
      )}
      aria-hidden
    >
      {[0, 1, 2].map((row) => (
        <span key={row} className="flex gap-[3px]">
          <span className={cn("rounded-full bg-current", dotSize)} />
          <span className={cn("rounded-full bg-current", dotSize)} />
        </span>
      ))}
    </span>
  );
}
