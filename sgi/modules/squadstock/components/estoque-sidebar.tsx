"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayersIcon, MenuIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "@/ui/icons";

interface Tipo {
  id: string;
  nome: string;
  slug: string;
}

// Sidebar fixo/colapsável padrão SquadUI (mesmo esqueleto do
// CatalogoSidebar — desktop fixo com toggle de colapso + FAB/drawer no
// mobile), adaptado pra navegação por querystring (?tipo=) em vez de rota:
// a ativa é lida do próprio useSearchParams, e o link preserva local_id/q
// ao trocar de tipo.
function NavLinks({ tipos, collapsed, onClose }: { tipos: Tipo[]; collapsed: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipoAtual = searchParams.get("tipo") ?? "";

  useEffect(() => { onClose(); }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildHref = (tipo: string) => {
    const usp = new URLSearchParams(searchParams.toString());
    if (tipo) usp.set("tipo", tipo);
    else usp.delete("tipo");
    usp.delete("pagina");
    const qs = usp.toString();
    return `/squadstock${qs ? `?${qs}` : ""}`;
  };

  const item = (href: string, label: string, ativo: boolean, key: string) => (
    <Link
      key={key}
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 mx-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        ativo ? "bg-primary/10 text-primary" : "text-text-2 hover:bg-bg hover:text-text"
      } ${collapsed ? "justify-center px-2" : ""}`}
      title={collapsed ? label : undefined}
    >
      <LayersIcon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <>
      {item(buildHref(""), "Todos", !tipoAtual, "todos")}
      {tipos.map((t) => item(buildHref(t.slug), t.nome, tipoAtual === t.slug, t.id))}
    </>
  );
}

export function EstoqueSidebar({ tipos }: { tipos: Tipo[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
        aria-label="Menu de tipos"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:hidden"
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
            <NavLinks tipos={tipos} collapsed={false} onClose={close} />
          </Suspense>
        </nav>
      </div>

      {/* Sidebar desktop — fixo, com toggle de colapso */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-surface transition-all duration-200 overflow-hidden ${collapsed ? "w-16" : "w-60"}`}>
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          {!collapsed && <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Tipo</p>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors ${collapsed ? "mx-auto" : ""}`}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <Suspense fallback={null}>
            <NavLinks tipos={tipos} collapsed={collapsed} onClose={() => {}} />
          </Suspense>
        </nav>
      </aside>
    </>
  );
}
