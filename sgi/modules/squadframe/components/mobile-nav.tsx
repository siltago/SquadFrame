"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import {
  MenuIcon, CloseIcon, BuildingIcon, BookOpenIcon,
  ShoppingBagIcon, DollarSignIcon, TasksIcon, UsersIcon,
} from "@/ui/icons";

const NAV_ITEMS = [
  { href: "/obras",      label: "Obras",      icon: <BuildingIcon size={20} />    },
  { href: "/catalogo",   label: "Catálogo",   icon: <BookOpenIcon size={20} />    },
  { href: "/compras",    label: "Compras",    icon: <ShoppingBagIcon size={20} /> },
  { href: "/financeiro", label: "Financeiro", icon: <DollarSignIcon size={20} />  },
  { href: "/tarefas",    label: "Tarefas",    icon: <TasksIcon size={20} />       },
  { href: "/usuarios",   label: "Usuários",   icon: <UsersIcon size={20} />       },
];

function NavLink({ href, children, onClick }: LinkProps & { children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href as string));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-2"
      }`}
    >
      {children}
    </Link>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ocultarBotao = pathname?.endsWith("/visualizar");

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {!ocultarBotao && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors sm:hidden"
        >
          <MenuIcon size={22} />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-[180ms] ease-out sm:hidden flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="SquadFrame" width={32} height={32} className="shrink-0" />
            <span className="text-base font-bold text-text">SquadFrame</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className="text-text-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
