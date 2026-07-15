"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function isoParaBr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function brParaIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function mascarar(v: string): string {
  const digitos = v.replace(/\D/g, "").slice(0, 8);
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean);
  return partes.join("/");
}

function paraIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DiaGrade {
  iso: string;
  dia: number;
  noMes: boolean;
}

// Grade de 42 células (6 semanas) começando na segunda-feira — inclui os
// dias do mês anterior/seguinte pra completar as semanas, mas eles ficam
// desabilitados (só o mês corrente é selecionável).
function construirDias(mesRef: Date): DiaGrade[] {
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const primeiroDoMes = new Date(ano, mes, 1);
  const offsetInicio = (primeiroDoMes.getDay() + 6) % 7; // getDay: 0=Dom..6=Sáb → semana começa na segunda
  const inicioGrade = new Date(ano, mes, 1 - offsetInicio);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrade);
    d.setDate(inicioGrade.getDate() + i);
    return { iso: paraIso(d), dia: d.getDate(), noMes: d.getMonth() === mes };
  });
}

const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];

function CalendarPopover({
  valorIso,
  onSelecionar,
}: {
  valorIso: string | null;
  onSelecionar: (iso: string) => void;
}) {
  const base = valorIso ? new Date(`${valorIso}T00:00:00`) : new Date();
  const [mesAtual, setMesAtual] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const dias = useMemo(() => construirDias(mesAtual), [mesAtual]);
  const hoje = useMemo(() => paraIso(new Date()), []);

  return (
    <div className="absolute z-20 mt-1 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded p-1 text-text-2 hover:bg-bg"
          aria-label="Mês anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-xs font-semibold capitalize text-text">
          {mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded p-1 text-text-2 hover:bg-bg"
          aria-label="Próximo mês"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-text-3">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((d) => {
          const selecionado = d.iso === valorIso;
          const ehHoje = d.iso === hoje;
          return (
            <button
              key={d.iso}
              type="button"
              tabIndex={d.noMes ? 0 : -1}
              onClick={() => d.noMes && onSelecionar(d.iso)}
              className={[
                "h-7 w-7 rounded-md text-xs transition-colors",
                !d.noMes && "pointer-events-none text-text-3/40",
                d.noMes && !selecionado && "text-text hover:bg-bg",
                selecionado && "bg-primary text-white",
                ehHoje && !selecionado && "font-bold text-primary",
              ].filter(Boolean).join(" ")}
            >
              {d.dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Input de data mascarado em dd/mm/aaaa, com botão de calendário (popover
 * com a UI do próprio sistema — respeita claro/escuro pelos mesmos tokens
 * de cor de `.field`). O valor exposto via onChange (e o `name` opcional,
 * pra forms nativos) continua no formato ISO (yyyy-mm-dd) — `<input
 * type="date">` exibe no locale do navegador/SO em vez de respeitar `lang`,
 * o que quebrava o formato dd/mm/yyyy pedido.
 */
export function DataInputBr({
  value,
  onChange,
  name,
  className,
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange?: (iso: string) => void;
  name?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [texto, setTexto] = useState(() => isoParaBr(value));
  const [aberto, setAberto] = useState(false);
  const [focado, setFocado] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  function aplicar(iso: string | null) {
    if (name && inputRef.current) {
      const hidden = inputRef.current.form?.elements.namedItem(name) as HTMLInputElement | null;
      if (hidden) hidden.value = iso ?? "";
    }
    onChange?.(iso ?? "");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={[className, "flex items-center gap-1"].filter(Boolean).join(" ")}
        style={
          focado
            ? { borderColor: "rgb(var(--color-primary))", boxShadow: "0 0 0 3px rgb(var(--color-primary) / 0.15)" }
            : undefined
        }
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={texto}
          maxLength={10}
          autoFocus={autoFocus}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            const mascarado = mascarar(e.target.value);
            setTexto(mascarado);
            aplicar(brParaIso(mascarado));
          }}
          className="w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-text-3"
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 text-text-3 hover:text-text-2"
          aria-label="Abrir calendário"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
      {aberto && (
        <CalendarPopover
          valorIso={brParaIso(texto)}
          onSelecionar={(iso) => {
            setTexto(isoParaBr(iso));
            aplicar(iso);
            setAberto(false);
          }}
        />
      )}
    </div>
  );
}

export function DataHiddenInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  return <input type="hidden" name={name} defaultValue={defaultValue} />;
}
