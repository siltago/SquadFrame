import Link from "next/link";

// Componentes visuais compartilhados por todos os guias de treinamento —
// reaproveita os tokens de design do próprio SquadFrame (classes "card",
// cores via bg-surface/text-text-2/etc.) em vez de um sistema visual à parte.

export function Pill({ tone, children }: { tone: "gray" | "amber" | "green" | "red" | "blue" | "purple"; children: React.ReactNode }) {
  const cls: Record<typeof tone, string> = {
    gray:   "bg-surface-3 text-text-2",
    amber:  "bg-warning-soft text-warning-hover",
    green:  "bg-success-soft text-success-hover",
    red:    "bg-danger-soft text-danger-hover",
    blue:   "bg-info-soft text-info",
    purple: "bg-primary-soft text-primary",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Callout({ tone = "tip", children }: { tone?: "tip" | "warn"; children: React.ReactNode }) {
  const border = tone === "warn" ? "border-l-warning" : "border-l-primary";
  return (
    <div className={`card border-l-4 ${border} px-4 py-3 text-sm text-text-2`}>
      {children}
    </div>
  );
}

export function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full rounded-xl border border-border shadow-sm" />
      {caption && <figcaption className="mt-1.5 text-xs text-text-3">{caption}</figcaption>}
    </figure>
  );
}

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="block rounded-md px-2.5 py-1.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text">
      {children}
    </a>
  );
}

// Passo a passo numerado — o coração de cada guia.
export function Steps({ title, items }: { title?: string; items: React.ReactNode[] }) {
  return (
    <div className="my-4">
      {title && <p className="mb-2.5 text-sm font-semibold text-text">{title}</p>}
      <ol className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-[15px] leading-relaxed text-text-2">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-9">
      <h3 className="mb-3 text-base font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

export type TocItem = { href: string; label: string };

// Casca comum de todo guia: sidebar com TOC + link de volta, e o cabeçalho
// (kicker/título/descrição) do topo do conteúdo.
export function GuiaLayout({
  backHref,
  backLabel,
  toc,
  kicker,
  titulo,
  descricao,
  children,
}: {
  backHref: string;
  backLabel: string;
  toc: TocItem[];
  kicker: string;
  titulo: string;
  descricao: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24">
          <Link href={backHref} className="mb-4 inline-block text-sm text-text-3 hover:text-text">{backLabel}</Link>
          <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-text-3">Neste guia</p>
          <nav className="space-y-0.5">
            {toc.map((item) => (
              <TocLink key={item.href} href={item.href}>{item.label}</TocLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mb-10 border-b border-border pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</p>
          <h1 className="text-3xl font-bold tracking-tight text-text">{titulo}</h1>
          <p className="mt-3 max-w-2xl text-text-2">{descricao}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
