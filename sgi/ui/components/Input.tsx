"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";
import { cn } from "@/ui/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  fullWidth?: boolean;
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.6" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefixIcon, suffixIcon, fullWidth = true, className, id, type, ...props },
  ref
) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const ehSenha = type === "password";
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = !!error;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixIcon && (
          <span className="pointer-events-none absolute left-3 text-text-3">
            {prefixIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={ehSenha ? (mostrarSenha ? "text" : "password") : type}
          className={cn(
            "field",
            prefixIcon  ? "pl-9" : undefined,
            (suffixIcon || ehSenha) ? "pr-9" : undefined,
            hasError    && "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgb(var(--color-danger)/0.15)]",
            className
          )}
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {ehSenha ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-3 text-text-3 hover:text-text-2"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : suffixIcon ? (
          <span className="pointer-events-none absolute right-3 text-text-3">
            {suffixIcon}
          </span>
        ) : null}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-[13px] text-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, fullWidth = true, className, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = !!error;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <textarea
        ref={ref}
        id={inputId}
        rows={props.rows ?? 3}
        className={cn(
          "field resize-y min-h-[80px]",
          hasError && "border-danger",
          className
        )}
        aria-invalid={hasError || undefined}
        {...props}
      />
      {hint  && !error && <p className="text-[13px] text-text-3">{hint}</p>}
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
});
