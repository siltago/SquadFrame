import { cn } from "@/ui/lib/cn";

interface CardSkeletonProps {
  lines?: 1 | 2 | 3;
  className?: string;
}

function Bone({ className }: { className?: string }) {
  return (
    <span className={cn("block animate-pulse rounded bg-surface-3", className)} />
  );
}

export function CardSkeleton({ lines = 2, className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-md border border-border bg-surface p-3.5",
        className
      )}
    >
      <Bone className="h-3.5 w-3/4" />
      {lines >= 2 && <Bone className="h-2.5 w-1/2" />}
      {lines >= 3 && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <Bone className="h-2 flex-1" />
          <Bone className="h-4 w-4 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function CardSkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={i === 0 ? 3 : 2} />
      ))}
    </div>
  );
}
