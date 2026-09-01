"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { NovaAbaInline } from "@/modules/squadstock/components/catalogo/nova-aba-inline";
import { ArrowLeftIcon, ChevronDownIcon } from "@/ui/icons";

type Tipo = { id: string; nome: string; slug: string };
type Linha = { id: string; nome: string; tipo: string };

// Menu completo com rótulos e sub-níveis (linha dentro de tipo, aplicação
// dentro de cores) — usado só no drawer mobile, onde cabe o espaço extra.
function NavLinksFull({
  tipos,
  linhas,
  onClose,
}: {
  tipos: Tipo[];
  linhas: Linha[];
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipoParam = (searchParams.get("tipo") ?? searchParams.get("aba") ?? "").toLowerCase();
  const linhaParam = searchParams.get("linha") ?? "";
  const aplicacaoParam = searchParams.get("aplicacao") ?? "";
  const onCatalogRoot = pathname === "/squadstock/catalogo";

  useEffect(() => { onClose(); }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhasPorTipo: Record<string, Linha[]> = {};
  for (const l of linhas) {
    if (!linhasPorTipo[l.tipo]) linhasPorTipo[l.tipo] = [];
    linhasPorTipo[l.tipo].push(l);
  }

  const tiposComLinhas = tipos.filter((t) => (linhasPorTipo[t.slug]?.length ?? 0) > 0);
  const tiposSemLinhas = tipos.filter((t) => (linhasPorTipo[t.slug]?.length ?? 0) === 0);

  return (
    <>
      {tiposComLinhas.map((tipo) => {
        const linhasDoTipo = linhasPorTipo[tipo.slug] ?? [];
        const tipoAtivo = onCatalogRoot && tipoParam === tipo.slug;
        return (
          <div key={tipo.slug} className="mb-1">
            <Link
              href={`/squadstock/catalogo?tipo=${tipo.slug}`}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 mx-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                tipoAtivo && !linhaParam ? "text-accent" : "text-text-3 hover:text-text-2"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              {tipo.nome}
            </Link>
            {linhasDoTipo.map((linha) => {
              const ativo = onCatalogRoot && tipoParam === tipo.slug && linhaParam === linha.id;
              return (
                <Link
                  key={linha.id}
                  href={`/squadstock/catalogo?tipo=${tipo.slug}&linha=${linha.id}`}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 mx-2 rounded-lg pl-7 pr-3 py-2 text-sm transition-colors",
                    ativo ? "bg-accent/10 text-accent font-medium" : "text-text-2 hover:bg-bg hover:text-text"
                  )}
                >
                  <span className="w-1 h-1 rounded-full shrink-0 bg-current opacity-40" />
                  {linha.nome}
                </Link>
              );
            })}
          </div>
        );
      })}

      {tiposSemLinhas.map((tipo) => {
        const ativo = onCatalogRoot && tipoParam === tipo.slug;
        return (
          <Link
            key={tipo.slug}
            href={`/squadstock/catalogo?tipo=${tipo.slug}`}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 mx-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              ativo ? "bg-accent/10 text-accent" : "text-text-2 hover:bg-bg hover:text-text"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            {tipo.nome}
          </Link>
        );
      })}

      <div className="mb-1">
        <Link
          href="/squadstock/catalogo?tipo=cores"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2 mx-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
            onCatalogRoot && tipoParam === "cores" && !aplicacaoParam ? "text-accent" : "text-text-3 hover:text-text-2"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          Cores RAL
        </Link>
        {onCatalogRoot && tipoParam === "cores" && tipos.map((tipo) => {
          const ativo = aplicacaoParam === tipo.slug;
          return (
            <Link
              key={tipo.slug}
              href={`/squadstock/catalogo?tipo=cores&aplicacao=${tipo.slug}`}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 mx-2 rounded-lg pl-7 pr-3 py-2 text-sm transition-colors",
                ativo ? "bg-accent/10 text-accent font-medium" : "text-text-2 hover:bg-bg hover:text-text"
              )}
            >
              <span className="w-1 h-1 rounded-full shrink-0 bg-current opacity-40" />
              {tipo.nome}
            </Link>
          );
        })}
      </div>
    </>
  );
}

// Rail largo com botão retangular (mesmo estilo arredondado do resto do
// sistema) pelo nome de cada tipo — sem ícone genérico tentando
// diferenciar categoria com nome dinâmico, que lia como quebrado. Clicar
// expande/recolhe as linhas daquele tipo ali mesmo, em vez de mandar pro
// drawer mobile pra ver o sub-nível.
function NavLinksExpand({ tipos, linhas }: { tipos: Tipo[]; linhas: Linha[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipoParam = (searchParams.get("tipo") ?? searchParams.get("aba") ?? "").toLowerCase();
  const linhaParam = searchParams.get("linha") ?? "";
  const aplicacaoParam = searchParams.get("aplicacao") ?? "";
  const onCatalogRoot = pathname === "/squadstock/catalogo";

  const linhasPorTipo: Record<string, Linha[]> = {};
  for (const l of linhas) {
    if (!linhasPorTipo[l.tipo]) linhasPorTipo[l.tipo] = [];
    linhasPorTipo[l.tipo].push(l);
  }

  const [aberto, setAberto] = useState<string | null>(
    onCatalogRoot && tipoParam ? tipoParam : null
  );

  const grupo = (slug: string, label: string, href: string, ativo: boolean, filhos?: React.ReactNode) => {
    const temFilhos = !!filhos;
    const expandido = aberto === slug;
    return (
      <div key={slug} className="mb-1">
        <div className="flex items-center gap-1">
          <Link
            href={href}
            onClick={() => temFilhos && setAberto(slug)}
            className={cn(
              "flex-1 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
              "transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)]",
              ativo
                ? "bg-gradient-to-br from-accent to-accent-hover text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
                : "text-text-2 hover:bg-surface-2 hover:text-text"
            )}
          >
            <span className="truncate">{label}</span>
          </Link>
          {temFilhos && (
            <button
              type="button"
              onClick={() => setAberto(expandido ? null : slug)}
              aria-label={expandido ? "Recolher" : "Expandir"}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-3",
                "transition-transform duration-[var(--motion-hover)] hover:bg-surface-2 hover:text-text",
                expandido && "rotate-180"
              )}
            >
              <ChevronDownIcon size={14} />
            </button>
          )}
        </div>
        {temFilhos && expandido && (
          <div className="mt-1 flex flex-col gap-0.5 pl-3">{filhos}</div>
        )}
      </div>
    );
  };

  const subItem = (href: string, label: string, ativo: boolean, key: string) => (
    <Link
      key={key}
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
        ativo ? "bg-accent/10 font-medium text-accent" : "text-text-2 hover:bg-bg hover:text-text"
      )}
    >
      <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <>
      {tipos.map((tipo) => {
        const linhasDoTipo = linhasPorTipo[tipo.slug] ?? [];
        const ativo = onCatalogRoot && tipoParam === tipo.slug && !linhaParam;
        return grupo(
          tipo.slug,
          tipo.nome,
          `/squadstock/catalogo?tipo=${tipo.slug}`,
          ativo,
          linhasDoTipo.length > 0
            ? linhasDoTipo.map((linha) =>
                subItem(
                  `/squadstock/catalogo?tipo=${tipo.slug}&linha=${linha.id}`,
                  linha.nome,
                  onCatalogRoot && tipoParam === tipo.slug && linhaParam === linha.id,
                  linha.id
                )
              )
            : undefined
        );
      })}
      {grupo(
        "cores",
        "Cores RAL",
        "/squadstock/catalogo?tipo=cores",
        onCatalogRoot && tipoParam === "cores" && !aplicacaoParam,
        tipos.map((tipo) =>
          subItem(
            `/squadstock/catalogo?tipo=cores&aplicacao=${tipo.slug}`,
            tipo.nome,
            aplicacaoParam === tipo.slug,
            tipo.slug
          )
        )
      )}
    </>
  );
}

export function CatalogoSidebar({ tipos, linhas }: { tipos: Tipo[]; linhas: Linha[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* FAB mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Menu do catálogo"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95 lg:hidden"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))", boxShadow: "0 4px 20px rgb(var(--color-primary) / 0.4)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={close} />
      )}

      {/* Drawer mobile — fora do Suspense para não ser desmontado durante navegação */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <div>
              <BackButton href="/" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-3">Catálogo</p>
            </div>
            <button
              onClick={close}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <Suspense fallback={null}>
            <NavLinksFull tipos={tipos} linhas={linhas} onClose={close} />
          </Suspense>
        </nav>
        <div className="border-t border-border px-2 py-2">
          <NovaAbaInline />
        </div>
      </div>

      {/* Rail desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col overflow-y-auto">
        <div className="flex shrink-0 items-center px-2 py-3">
          <Link
            href="/"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-3 transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110 hover:bg-surface-2 hover:text-text"
          >
            <ArrowLeftIcon size={16} />
          </Link>
        </div>
        <nav className="flex-1 px-2 py-1">
          <Suspense fallback={null}>
            <NavLinksExpand tipos={tipos} linhas={linhas} />
          </Suspense>
        </nav>
        <div className="shrink-0 px-2 py-3">
          <NovaAbaInline />
        </div>
      </aside>
    </>
  );
}
