"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { LayersIcon, MenuIcon, CloseIcon } from "@/ui/icons";

interface Tipo {
  id: string;
  nome: string;
  slug: string;
}

function buildHref(searchParams: URLSearchParams, tipo: string): string {
  const usp = new URLSearchParams(searchParams.toString());
  if (tipo) usp.set("tipo", tipo);
  else usp.delete("tipo");
  usp.delete("pagina");
  const qs = usp.toString();
  return `/squadstock${qs ? `?${qs}` : ""}`;
}

// Lista completa com rótulo — usada no drawer mobile.
function NavLinksFull({ tipos, onClose }: { tipos: Tipo[]; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipoAtual = searchParams.get("tipo") ?? "";

  useEffect(() => { onClose(); }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const item = (href: string, label: string, ativo: boolean, key: string) => (
    <Link
      key={key}
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 mx-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
        ativo ? "bg-primary text-white" : "text-text-2 hover:bg-bg hover:text-text"
      )}
    >
      <LayersIcon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <>
      {item(buildHref(searchParams, ""), "Todos", !tipoAtual, "todos")}
      {tipos.map((t) => item(buildHref(searchParams, t.slug), t.nome, tipoAtual === t.slug, t.id))}
    </>
  );
}

// Rail estreito — cada "tipo" é dinâmico (nome do usuário), sem ícone
// próprio pra diferenciar, então usa as iniciais do nome num badge
// redondo (mesmo padrão de avatar já usado no resto do sistema).
function NavLinksRail({ tipos }: { tipos: Tipo[] }) {
  const searchParams = useSearchParams();
  const tipoAtual = searchParams.get("tipo") ?? "";

  const railItem = (href: string, label: string, ativo: boolean, key: string, content: React.ReactNode) => (
    <Tooltip key={key} content={label} side="right" delay={150}>
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold",
          "transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110",
          ativo ? "bg-primary text-white shadow-md" : "text-text-3 hover:bg-surface-2 hover:text-text"
        )}
      >
        {content}
      </Link>
    </Tooltip>
  );

  return (
    <>
      {railItem(buildHref(searchParams, ""), "Todos", !tipoAtual, "todos", <LayersIcon size={18} />)}
      {tipos.map((t) =>
        railItem(buildHref(searchParams, t.slug), t.nome, tipoAtual === t.slug, t.id, t.nome.slice(0, 2).toUpperCase())
      )}
    </>
  );
}

export function EstoqueSidebar({ tipos }: { tipos: Tipo[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* FAB mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Menu de tipos"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95 lg:hidden"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))", boxShadow: "0 4px 20px rgb(var(--color-primary) / 0.4)" }}
      >
        <MenuIcon size={22} />
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={close} />
      )}

      {/* Drawer mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Tipo</p>
            <button onClick={close} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <Suspense fallback={null}>
            <NavLinksFull tipos={tipos} onClose={close} />
          </Suspense>
        </nav>
      </div>

      {/* Rail desktop */}
      <aside className="hidden lg:flex w-[64px] shrink-0 flex-col items-center">
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-3">
          <Suspense fallback={null}>
            <NavLinksRail tipos={tipos} />
          </Suspense>
        </nav>
      </aside>
    </>
  );
}
