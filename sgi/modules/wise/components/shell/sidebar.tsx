"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import {
  DashboardIcon, BuildingIcon, LayersIcon, BriefcaseIcon,
  UsersIcon, ShieldIcon, GridIcon, ActivityIcon,
  ChevronLeftIcon, ChevronRightIcon, MenuIcon, CloseIcon,
} from "@/ui/icons";

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

// Navegação por domínio, não por tabela — ver seção 12 da spec de
// UI/UX. Fase 1 só expõe Organização/Pessoas e Acessos/Módulos/
// Auditoria; domínios futuros (Obras, Catálogo, Registry,
// Configuration Center...) entram como novos grupos quando existirem
// — evitar item desabilitado "em breve" no menu, que passa sensação
// de sistema incompleto.
const NAV: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/squadwise", label: "Visão geral", icon: <DashboardIcon size={18} />, exact: true },
    ],
  },
  {
    label: "Organização",
    items: [
      { href: "/squadwise/empresa", label: "Empresa", icon: <BuildingIcon size={18} /> },
      { href: "/squadwise/setores", label: "Setores",  icon: <LayersIcon size={18} /> },
      { href: "/squadwise/cargos",  label: "Cargos",   icon: <BriefcaseIcon size={18} /> },
    ],
  },
  {
    label: "Pessoas e acessos",
    items: [
      { href: "/squadwise/usuarios", label: "Usuários", icon: <UsersIcon size={18} /> },
      { href: "/squadwise/papeis",   label: "Papéis",   icon: <ShieldIcon size={18} /> },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/squadwise/modulos",   label: "Módulos",   icon: <GridIcon size={18} /> },
      { href: "/squadwise/auditoria", label: "Auditoria", icon: <ActivityIcon size={18} /> },
    ],
  },
];

/**
 * Sidebar do SquadWise — sempre escura (tokens --color-sidebar-*),
 * mesmo padrão de interação do SquadBoardSidebar (colapsa, persiste em
 * localStorage, drawer mobile), agrupada por domínio em vez de lista
 * plana — ver seção 12 da spec de UI/UX do Wise.
 */
export function SquadWiseSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("squadwise-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("squadwise-sidebar-collapsed", String(!c));
      return !c;
    });
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const nav = (isCollapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {NAV.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-4" : undefined}>
          {group.label && !isCollapsed && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted">
              {group.label}
            </p>
          )}
          {group.label && isCollapsed && <div className="my-2 border-t border-sidebar-border" />}
          {group.items.map((item) => {
            const active = isActive(item);
            const link = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[120ms]",
                  isCollapsed && "justify-center px-2",
                  active
                    ? "bg-sidebar-surface text-sidebar-text"
                    : "text-sidebar-muted hover:bg-sidebar-surface hover:text-sidebar-text"
                )}
              >
                <span className={cn("shrink-0", active && "text-sidebar-active")}>{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
            return (
              <div key={item.href} className="mb-0.5">
                {isCollapsed ? (
                  <Tooltip content={item.label} side="right" delay={150}>{link}</Tooltip>
                ) : link}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border",
          "transition-[width] ease-out"
        )}
        style={{ width: collapsed ? 72 : 260, transitionDuration: "var(--motion-sidebar)" }}
      >
        <div className={cn("flex shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4 py-4", collapsed && "justify-center px-2")}>
          <img src="/squadwise.png" alt="SquadWise" className="h-6 w-6 shrink-0 object-contain" />
          {!collapsed && <span className="truncate text-sm font-semibold text-sidebar-text">SquadWise</span>}
        </div>

        {nav(collapsed)}

        <button
          onClick={toggle}
          className="flex h-10 shrink-0 items-center justify-center border-t border-sidebar-border text-sidebar-muted transition-colors duration-[120ms] hover:bg-sidebar-surface hover:text-sidebar-text"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRightIcon size={15} /> : <ChevronLeftIcon size={15} />}
        </button>
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sidebar text-sidebar-text shadow-lg lg:hidden"
      >
        <MenuIcon size={20} />
      </button>

      {/* Mobile drawer */}
      <div
        className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-[180ms]", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar shadow-2xl lg:hidden",
          "transition-transform ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ transitionDuration: "var(--motion-sidebar)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/squadwise.png" alt="SquadWise" className="h-6 w-6 shrink-0 object-contain" />
            <span className="truncate text-sm font-semibold text-sidebar-text">SquadWise</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="shrink-0 text-sidebar-muted hover:text-sidebar-text">
            <CloseIcon size={18} />
          </button>
        </div>
        {nav(false)}
      </aside>
    </>
  );
}
