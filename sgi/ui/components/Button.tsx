"use client";

import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "@/ui/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning" | "accent";
export type ButtonSize    = "sm" | "md" | "lg";

type ButtonBase = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type AsButton = ButtonBase & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button"; href?: never };
type AsAnchor = ButtonBase & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href?: string; disabled?: boolean };

export type ButtonProps = AsButton | AsAnchor;

const variantStyles: Record<ButtonVariant, string> = {
  primary:   "bg-primary text-white hover:bg-primary-hover border-transparent",
  secondary: "bg-surface-2 text-text hover:bg-surface-3 border-border",
  outline:   "bg-transparent text-primary hover:bg-primary-soft border-primary",
  ghost:     "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text border-transparent",
  danger:    "bg-danger text-white hover:bg-danger-hover border-transparent",
  success:   "bg-success text-white hover:bg-success-hover border-transparent",
  warning:   "bg-warning text-white hover:bg-warning-hover border-transparent",
  accent:    "bg-accent text-white hover:bg-accent-hover border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7  px-3   text-xs  gap-1.5",
  md: "h-9  px-4   text-sm  gap-2",
  lg: "h-11 px-5   text-base gap-2.5",
};

const BASE_CLS = cn(
  "inline-flex items-center justify-center font-semibold border",
  "transition-all duration-[120ms] active:scale-[0.97]",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
  "whitespace-nowrap select-none rounded-md"
);

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className, children, as, ...props },
  ref
) {
  const cls = cn(BASE_CLS, variantStyles[variant], sizeStyles[size], fullWidth && "w-full", className);
  const content = loading ? (<><Spinner size={size} />{children}</>) : children;

  if (as === "a") {
    const { disabled, ...anchorProps } = props as AsAnchor;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={cn(cls, disabled && "opacity-40 pointer-events-none")}
        aria-disabled={disabled}
        {...anchorProps}
      >
        {content}
      </a>
    );
  }

  const { disabled, ...btnProps } = props as AsButton;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      disabled={disabled || loading}
      className={cls}
      {...btnProps}
    >
      {content}
    </button>
  );
});

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  return (
    <svg
      width={dim} height={dim}
      viewBox="0 0 24 24" fill="none"
      className="animate-spin opacity-70"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
    </svg>
  );
}
