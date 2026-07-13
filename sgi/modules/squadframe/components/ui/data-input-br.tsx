"use client";

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

/**
 * Input de data mascarado em dd/mm/aaaa. O valor exposto via onChange (e o
 * `name` opcional, para forms nativos) continua no formato ISO (yyyy-mm-dd),
 * já que `<input type="date">` exibe no locale do navegador/SO em vez de
 * respeitar `lang`, o que quebrava o formato dd/mm/yyyy pedido.
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
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      defaultValue={isoParaBr(value)}
      maxLength={10}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      className={className}
      onChange={(e) => {
        const mascarado = mascarar(e.target.value);
        if (mascarado !== e.target.value) e.target.value = mascarado;
        const iso = brParaIso(mascarado);
        if (name) {
          const hidden = e.target.form?.elements.namedItem(name) as HTMLInputElement | null;
          if (hidden) hidden.value = iso ?? "";
        }
        onChange?.(iso ?? "");
      }}
    />
  );
}

export function DataHiddenInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  return <input type="hidden" name={name} defaultValue={defaultValue} />;
}
