"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import {
  DashboardIcon, BuildingIcon, LayersIcon, BriefcaseIcon,
  UsersIcon, ShieldIcon, ActivityIcon, MenuIcon, CloseIcon,
  HomeIcon,
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
      { href: "/squadwise/unidades", label: "Unidades", icon: <BuildingIcon size={18} /> },
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
    label: "Planejamento",
    items: [
      { href: "/squadwise/obras",   label: "Obras",   icon: <HomeIcon size={18} /> },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/squadwise/auditoria", label: "Auditoria", icon: <ActivityIcon size={18} /> },
    ],
  },
];

/**
 * Sidebar do SquadWise — sempre escura (tokens --color-sidebar-*). Rail
 * estreito só de ícones, mesmo padrão do resto do sistema: bolinha de
 * destaque (--color-sidebar-active) no item ativo, tooltip no hover,
 * grupos separados por divisor fino em vez de rótulo de texto.
 */
export function SquadWiseSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:flex w-[64px] shrink-0 flex-col items-center bg-sidebar border-r border-sidebar-border">
        <div className="flex shrink-0 items-center justify-center border-b border-sidebar-border py-4">
          <img src="/squadwise.png" alt="SquadWise" className="h-7 w-7 shrink-0 object-contain" />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-3">
          {NAV.map((group, gi) => (
            <div key={gi} className={cn("flex flex-col items-center gap-1.5", gi > 0 && "mt-2 border-t border-sidebar-border pt-2")}>
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <Tooltip key={item.href} content={item.label} side="right" delay={150}>
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full",
                        "transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110",
                        active ? "bg-sidebar-active text-white shadow-md" : "text-sidebar-muted hover:bg-sidebar-surface hover:text-sidebar-text"
                      )}
                    >
                      {item.icon}
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-active text-white shadow-lg transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95 lg:hidden"
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
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : undefined}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <div key={item.href} className="mb-0.5">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-sidebar-active text-white" : "text-sidebar-muted hover:bg-sidebar-surface hover:text-sidebar-text"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
