"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon, CloseIcon } from "@/ui/icons";

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
  header?: ReactNode;
  footer?: ReactNode;
  defaultCollapsed?: boolean;
  storageKey?: string;
  className?: string;
  hideMobileTrigger?: boolean;
}

export function AppSidebar({
  sections,
  header,
  footer,
  defaultCollapsed = false,
  storageKey = "squad-sidebar",
  className,
  hideMobileTrigger = false,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  /* Persist collapsed state */
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setCollapsed(stored === "true");
  }, [storageKey]);

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  /* Close mobile on navigate */
  useEffect(() => setMobileOpen(false), [pathname]);

  /* Body scroll lock on mobile */
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

  const navContent = (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2 py-2">
      {sections.map((section, si) => (
        <div key={si} className={cn(si > 0 && "mt-4")}>
          {section.title && !collapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-3">
              {section.title}
            </p>
          )}
          {section.items
            .filter(item => item.permission !== false)
            .map(item => {
              const active = isActive(item);
              const button = (
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold",
                    "transition-colors duration-[120ms]",
                    active
                      ? "bg-primary text-white"
                      : "text-text-2 hover:bg-surface-2 hover:text-text",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-white" : "text-text-3 group-hover:text-text"
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      active ? "bg-white/25 text-white" : "bg-surface-3 text-text-2"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href} content={item.label} side="right" delay={100}>
                  <div className="relative">
                    {button}
                    {item.badge !== undefined && (
                      <span className="absolute right-0.5 top-0.5 h-3.5 min-w-3.5 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Tooltip>
              ) : (
                <div key={item.href}>{button}</div>
              );
            })}
        </div>
      ))}
    </nav>
  );

  /* ── Desktop sidebar ─────────────────────────────────────── */
  const desktopSidebar = (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-border bg-surface overflow-hidden shrink-0",
        "transition-[width] ease-out",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
      style={{ transitionDuration: "var(--motion-sidebar)" }}
    >
      {/* Header slot */}
      {header && (
        <div className={cn(
          "shrink-0 border-b border-divider transition-all duration-[120ms]",
          collapsed ? "px-2 py-3" : "px-4 py-3"
        )}>
          {header}
        </div>
      )}

      {/* Nav */}
      {navContent}

      {/* Footer slot — hidden when collapsed (buttons too wide for 72px) */}
      {footer && !collapsed && (
        <div className="shrink-0 border-t border-divider px-4 py-3">
          {footer}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className={cn(
          "shrink-0 flex items-center justify-center h-10 border-t border-divider",
          "text-text-3 hover:text-text hover:bg-surface-2 transition-colors duration-[120ms]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        )}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
      </button>
    </aside>
  );

  /* ── Mobile FAB + Drawer ─────────────────────────────────── */
  const mobileSidebar = (
    <>
      {/* FAB */}
      {!hideMobileTrigger && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className={cn(
            "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full",
            "shadow-xl text-white lg:hidden",
            "transition-transform active:scale-95"
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

      {/* Backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden",
          "transition-opacity duration-[180ms]",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer */}
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
        {header && <div className="px-4 py-3 border-b border-divider shrink-0">{header}</div>}
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
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
                      "transition-colors duration-[120ms]",
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
        {footer && <div className="px-4 py-3 border-t border-divider shrink-0">{footer}</div>}
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
