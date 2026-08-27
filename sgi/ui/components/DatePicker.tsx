"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/ui/lib/cn";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatPtBR(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface DatePickerProps {
  /** Se passado, renderiza um input hidden com esse name — pra formulário GET normal. */
  name?: string;
  defaultValue?: string;
  /** Modo TOTALMENTE controlado — sincroniza sempre que essa prop mudar
   * externamente (ex.: dado vindo do servidor após um save). Se só precisa
   * do valor inicial (formulário GET), use `defaultValue` em vez disso. */
  value?: string;
  /** Chamado com a data em ISO (ou "" pra limpar) a cada seleção. */
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Calendário próprio, sempre em pt-BR — o <input type="date"> nativo segue
// o idioma do navegador/SO do usuário (não o lang="pt-BR" da página), então
// não dá pra garantir português só com HTML/CSS. Serve como campo de
// formulário GET normal (passa `name`+`defaultValue`, sem precisar de JS no
// submit), como componente controlado (passa `value`+`onChange`, salvando
// direto ao mudar e reagindo a atualização externa do valor) ou os dois.
export function DatePicker({ name, defaultValue, value: controlledValue, onChange, placeholder = "Selecionar data", className }: DatePickerProps) {
  const initial = parseISO(controlledValue ?? defaultValue);
  const [value, setValue] = useState<Date | null>(initial);

  useEffect(() => {
    if (controlledValue === undefined) return;
    setValue(parseISO(controlledValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue]);
  const [viewDate, setViewDate] = useState<Date>(initial ?? new Date());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
  }

  const today = new Date();

  return (
    <div ref={ref} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value ? toISO(value) : ""} />}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="field flex h-9 w-full cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className="truncate text-text">{value ? formatPtBR(value) : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="card absolute z-50 mt-1.5 w-64 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-2 transition-transform duration-[80ms] hover:scale-110 hover:bg-surface-2"
              aria-label="Mês anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-sm font-semibold text-text">{MESES[month]} {year}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-2 transition-transform duration-[80ms] hover:scale-110 hover:bg-surface-2"
              aria-label="Próximo mês"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-3">
            {DIAS.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map(({ date, outside }, i) => {
              const selected = value ? sameDay(date, value) : false;
              const isToday = sameDay(date, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setValue(date); setViewDate(date); setOpen(false); onChange?.(toISO(date)); }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-transform duration-[80ms] hover:scale-110",
                    outside && "text-text-3/50 hover:bg-surface-2",
                    !outside && !selected && "text-text hover:bg-surface-2",
                    selected && "bg-accent font-semibold text-white",
                    !selected && isToday && "ring-1 ring-accent"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { setValue(null); onChange?.(""); }}
              className="mt-2 w-full rounded-md py-1.5 text-center text-xs font-medium text-text-3 hover:bg-surface-2 hover:text-text"
            >
              Limpar data
            </button>
          )}
        </div>
      )}
    </div>
  );
}
