import { HTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/ui/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const paddingStyles = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", hoverable, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "card",
        paddingStyles[padding],
        hoverable && "transition-shadow duration-[120ms] hover:shadow-lg cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-text", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-text-2", className)} {...props}>
      {children}
    </p>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 border-t border-divider pt-4 flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export type StatCardTone = "success" | "warning" | "danger" | "info";

// Var CSS por tom — reaproveita as cores semânticas já definidas por app em
// globals.css (--color-success/warning/danger/info), nunca uma cor solta.
const TONE_VAR: Record<StatCardTone, string> = {
  success: "--color-success",
  warning: "--color-warning",
  danger:  "--color-danger",
  info:    "--color-info",
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  /** @deprecated use `tone` — cor semântica, nunca hex solto */
  color?: string;
  tone?: StatCardTone;
  href?: string;
  trend?: { value: number; label?: string };
  /** `accent` = card de destaque em gradiente (1 por dashboard, tipo "Total Earnings") */
  variant?: "default" | "accent";
  className?: string;
}

// StatCard único do SquadUI — antes existiam duas versões incompatíveis
// (esta e modules/squadframe/components/stat-card.tsx, removida). Ícone
// sempre num badge arredondado tingido pelo tom semântico; variant="accent"
// é o card de destaque em gradiente da referência visual — usa --color-accent
// (o token da paleta reservado pra "um toque de cor", não o --color-primary,
// que em alguns apps — ex. SquadFrame claro — é um neutro escuro sóbrio de
// propósito e ficaria sem vida num gradiente cheio).
export function StatCard({ label, value, sub, icon, color, tone, href, trend, variant = "default", className }: StatCardProps) {
  const Wrapper = href ? "a" : "div";
  const isAccent = variant === "accent";
  const toneVar = tone ? TONE_VAR[tone] : null;

  return (
    <Wrapper
      href={href}
      className={cn(
        "group relative overflow-hidden flex flex-col gap-3 p-5",
        "transition-[transform,box-shadow] ease-[var(--ease-spring)]",
        isAccent ? "text-white" : "card",
        href && "cursor-pointer hover:-translate-y-1",
        !isAccent && href && "hover:shadow-2xl",
        className
      )}
      style={{
        transitionDuration: "220ms",
        borderRadius: "var(--radius-xl)",
        ...(isAccent
          ? {
              background: "linear-gradient(135deg, rgb(var(--color-accent)), rgb(var(--color-accent-hover)))",
              boxShadow: "0 20px 40px -12px rgb(var(--color-accent) / var(--statcard-accent-glow)), inset 0 1px 0 rgb(255 255 255 / 0.25)",
            }
          : {}),
      }}
    >
      {/* Sheen + blob decorativo — mesmo recurso do LoadingOverlay, só no
          card de destaque, com um brilho circular extra pro efeito glossy. */}
      {isAccent && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/0 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium leading-snug", isAccent ? "text-white/85" : "text-text-2")}>{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-3",
              isAccent && "bg-white/20 text-white"
            )}
            style={
              !isAccent
                ? {
                    backgroundColor: toneVar ? `rgb(var(${toneVar}) / 0.14)` : color ? `${color}18` : "rgb(var(--color-accent) / 0.14)",
                    color: toneVar ? `rgb(var(${toneVar}))` : color ?? "rgb(var(--color-accent))",
                    boxShadow: toneVar
                      ? `0 4px 12px -4px rgb(var(${toneVar}) / var(--statcard-icon-glow))`
                      : "0 4px 12px -4px rgb(var(--color-accent) / var(--statcard-icon-glow))",
                  }
                : undefined
            }
          >
            {icon}
          </span>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-2">
        <p
          className={cn("text-2xl font-bold leading-none tabular-nums", isAccent && "text-white")}
          style={!isAccent ? { color: toneVar ? `rgb(var(${toneVar}))` : color ?? "rgb(var(--color-text))" } : undefined}
        >
          {value}
        </p>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0",
            isAccent
              ? "bg-white/20 text-white"
              : trend.value >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>

      {sub && <p className={cn("relative text-xs", isAccent ? "text-white/70" : "text-text-3")}>{sub}</p>}
    </Wrapper>
  );
}
