"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { KanbanIcon, HubIcon, CalendarIcon, SettingsIcon, MenuIcon, CloseIcon } from "@/ui/icons";

const NAV = [
  { href: "/squadboard", label: "Quadro Operacional", icon: <KanbanIcon size={18} />, exact: true },
  { href: "/squadboard/interno", label: "Quadro Interno", icon: <HubIcon size={18} /> },
  { href: "/squadboard/calendario", label: "Calendário", icon: <CalendarIcon size={18} /> },
  { href: "/squadboard/configuracoes", label: "Configurações", icon: <SettingsIcon size={18} /> },
];

/**
 * Sidebar do SquadBoard — sempre escura (tokens --color-sidebar-*),
 * independente do tema claro/escuro do resto do app. Rail estreito só de
 * ícones (mesmo padrão de todo o sistema, ex.: FinanceiroTabNav): bolinha
 * de destaque (--color-sidebar-active) no item ativo, tooltip no hover.
 */
export function SquadBoardSidebar({ boardNome }: { boardNome: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (item: typeof NAV[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:flex w-[64px] shrink-0 flex-col items-center bg-sidebar border-r border-sidebar-border">
        <div className="flex shrink-0 items-center justify-center border-b border-sidebar-border py-4">
          <img src="/logo-board.png" alt="SquadBoard" className="h-7 w-7 shrink-0 object-contain" title={boardNome} />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-3">
          {NAV.map((item) => {
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
            <img src="/logo-board.png" alt="SquadBoard" className="h-6 w-6 shrink-0 object-contain" />
            <span className="truncate text-sm font-semibold text-sidebar-text">{boardNome}</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="shrink-0 text-sidebar-muted hover:text-sidebar-text">
            <CloseIcon size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((item) => {
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
        </nav>
      </aside>
    </>
  );
}
