import Link from "next/link";

interface Props {
  paginaAtual: number;
  total: number;
  porPagina: number;
  buildUrl: (pagina: number) => string;
}

export function Paginacao({ paginaAtual, total, porPagina, buildUrl }: Props) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, total);

  const paginas: (number | "...")[] = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
      paginas.push(i);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
      <span className="text-ink-faint text-xs">
        {inicio}–{fim} de {total}
      </span>
      <div className="flex items-center gap-1">
        <PagLink href={buildUrl(paginaAtual - 1)} disabled={paginaAtual <= 1} label="‹" />
        {paginas.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-2 text-ink-faint">…</span>
          ) : (
            <PagLink key={p} href={buildUrl(p as number)} active={p === paginaAtual} label={String(p)} />
          ),
        )}
        <PagLink href={buildUrl(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas} label="›" />
      </div>
    </div>
  );
}

function PagLink({ href, label, active, disabled }: { href: string; label: string; active?: boolean; disabled?: boolean }) {
  if (disabled) {
    return <span className="flex h-9 w-9 items-center justify-center rounded text-xs text-ink-faint/40">{label}</span>;
  }
  return (
    <Link
      href={href}
      className={`flex h-9 w-9 items-center justify-center rounded text-xs font-medium transition-colors ${
        active ? "bg-steel text-white" : "text-ink-soft hover:bg-canvas"
      }`}
    >
      {label}
    </Link>
  );
}
