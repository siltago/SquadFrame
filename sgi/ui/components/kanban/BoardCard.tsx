import { forwardRef } from "react";
import { cn } from "@/ui/lib/cn";

interface BoardCardProps {
  children: React.ReactNode;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  colorStrip?: string; // classe de cor bg-* para a tarja do topo (ex: "bg-warning")
}

export const BoardCard = forwardRef<HTMLDivElement, BoardCardProps>(
  function BoardCard({ children, isDragging, isOverlay, onClick, className, style, colorStrip }, ref) {
    return (
      <div
        ref={ref}
        style={style}
        onClick={onClick}
        className={cn(
          "group relative flex flex-col rounded-md border border-border bg-surface overflow-hidden",
          "transition-shadow duration-[120ms]",
          isDragging ? "opacity-40" : "cursor-pointer hover:shadow-sm",
          isOverlay && "rotate-[1.5deg] shadow-lg",
          className
        )}
      >
        {colorStrip && (
          <div className={cn("h-[6px] w-full shrink-0", colorStrip)} />
        )}
        <div className="flex flex-col gap-2.5 p-3.5">
          {children}
        </div>
      </div>
    );
  }
);
