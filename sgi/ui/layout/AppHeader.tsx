"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/ui/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

interface AppHeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  appName?: string;
  homeHref?: string;
  navItems?: NavItem[];
  rightSlot?: ReactNode;
  mobileNavSlot?: ReactNode;
  height?: number;
  className?: string;
}

export function AppHeader({
  logoSrc = "/favicon.png",
  logoAlt = "Logo",
  appName = "SquadFrame",
  homeHref = "/",
  navItems = [],
  rightSlot,
  mobileNavSlot,
  height = 56,
  className,
}: AppHeaderProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-end gap-2 px-3 sm:gap-3 sm:px-5",
        "border-b border-white/10",
        className
      )}
      style={{
        backgroundColor: "rgb(var(--color-header))",
        paddingTop: "env(safe-area-inset-top)",
        height: `calc(${height}px + env(safe-area-inset-top))`,
      }}
    >
      {/* Mobile nav slot (hamburger button) */}
      {mobileNavSlot && <div className="sm:hidden shrink-0">{mobileNavSlot}</div>}

      {/* Logo */}
      <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 py-1">
        {logoSrc && (
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={26}
            height={26}
            className="shrink-0"
          />
        )}
        <span className="text-base font-bold leading-none text-white hidden sm:inline">
          {appName}
        </span>
      </Link>

      {/* Desktop nav */}
      {navItems.length > 0 && (
        <nav className="hidden sm:flex flex-1 items-center gap-0.5 px-2" aria-label="Navegação principal">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-[120ms]",
                isActive(item)
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Right actions */}
      {rightSlot && (
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 pb-1">
          {rightSlot}
        </div>
      )}
    </header>
  );
}
