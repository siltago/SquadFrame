"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { MenuIcon, CloseIcon } from "@/ui/icons";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  badge?: number | string;
  permission?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

interface AppSidebarProps {
  sections: SidebarSection[];
  /** Rail estreito: sem rótulo, ícone com tooltip — mesmo padrão do
   * FinanceiroTabNav. Passe botões redondos (h-11 w-11 rounded-full) com
   * Tooltip próprio, no mesmo estilo dos itens de navegação. */
  footer?: ReactNode;
  className?: string;
  hideMobileTrigger?: boolean;
}

// Rail vertical fino de ícones — mesmo padrão em todo o sistema (era o
// financeiro que definiu a referência): botão redondo, bolinha escura
// (--color-primary) no item ativo, tooltip no lugar de rótulo de texto.
// Substituiu a versão anterior (lista larga com rótulo sempre visível +
// toggle colapsar) que destoava visualmente desse padrão já estabelecido.
export function AppSidebar({
  sections,
  footer,
  className,
  hideMobileTrigger = false,
}: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      if (mobileOpen) document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (item: SidebarNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?");

  const railItem = (item: SidebarNavItem) => {
    const active = isActive(item);
    return (
      <Tooltip key={item.href} content={item.label} side="right" delay={150}>
        <Link
          href={item.href}
          aria-label={item.label}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full",
            "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110",
            active ? "bg-primary text-white shadow-md" : "text-text-3 hover:bg-surface-2 hover:text-text"
          )}
        >
          <span className="[&>svg]:h-[19px] [&>svg]:w-[19px]">{item.icon}</span>
          {item.badge !== undefined && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white">
              {item.badge}
            </span>
          )}
        </Link>
      </Tooltip>
    );
  };

  // Mesma configuração exata do FinanceiroTabNav — fixed, ancorado no
  // mesmo left do header (px-3/sm:px-5), w-14, gap-1.5 py-1, sem painel
  // nem borda. É o padrão de referência: qualquer rail de ícones do
  // sistema usa esses mesmos valores, não uma reinterpretação.
  const desktopSidebar = (
    <nav
      className={cn(
        "fixed left-3 top-[158px] z-40 hidden w-14 flex-col items-center gap-1.5 py-1 sm:left-5 lg:flex",
        className
      )}
    >
      {sections.map((section, si) => (
        <div key={si} className={cn("flex flex-col items-center gap-1.5", si > 0 && "mt-3")}>
          {section.items.filter(item => item.permission !== false).map(railItem)}
        </div>
      ))}
      {footer && (
        <div className="mt-3 flex flex-col items-center gap-1.5">
          {footer}
        </div>
      )}
    </nav>
  );

  /* ── Mobile FAB + Drawer (rótulos visíveis — espaço não é um problema
      no drawer cheio, e toque precisa de alvo maior que ícone puro) ── */
  const mobileSidebar = (
    <>
      {!hideMobileTrigger && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className={cn(
            "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full",
            "shadow-xl text-white lg:hidden",
            "transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95"
          )}
          style={{
            bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            right: "calc(1.25rem + env(safe-area-inset-right))",
            backgroundColor: "rgb(var(--color-primary))",
            boxShadow: "0 4px 20px rgb(var(--color-primary) / 0.4)",
          }}
        >
          <MenuIcon size={22} />
        </button>
      )}

      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden",
          "transition-opacity duration-[180ms]",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-surface border-r border-border",
          "lg:hidden shadow-xl",
          "transition-transform ease-out duration-[180ms]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
          <span className="text-sm font-bold text-text">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-2 hover:bg-surface-2"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {sections.map((section, si) => (
            <div key={si} className={cn(si > 0 && "mt-4")}>
              {section.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-3">
                  {section.title}
                </p>
              )}
              {section.items.filter(i => i.permission !== false).map(item => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold",
                      "transition-colors duration-[var(--motion-hover)]",
                      active
                        ? "bg-primary text-white"
                        : "text-text-2 hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <span className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-text-3")}>
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        active ? "bg-white/25 text-white" : "bg-surface-3 text-text-2"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        {footer && <div className="px-4 py-3 border-t border-divider shrink-0 flex flex-wrap gap-2 justify-center">{footer}</div>}
      </aside>
    </>
  );

  return (
    <>
      {desktopSidebar}
      {mobileSidebar}
    </>
  );
}
