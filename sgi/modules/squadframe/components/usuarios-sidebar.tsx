"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { Button } from "@/ui/components/Button";

type Setor = { id: string; nome: string; cor: string; count: number };

const TOP_ITEMS = [
  {
    href: "/squadframe/usuarios",
    label: "Todos os usuários",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/squadframe/usuarios/cargos",
    label: "Cargos e Setores",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
];

export function UsuariosSidebar({ setores }: { setores: Setor[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/squadframe/usuarios" ? pathname === "/squadframe/usuarios" : pathname.startsWith(href);

  const NavContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {!collapsed && (
          <div>
            <BackButton href="/" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-3">Usuários</p>
          </div>
        )}
        <button
          onClick={onClose ?? (() => setCollapsed(!collapsed))}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors ${collapsed && !onClose ? "mx-auto" : ""}`}
        >
          {onClose ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <polyline points="9 18 15 12 9 6"/> : <polyline points="15 18 9 12 15 6"/>}
            </svg>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {TOP_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={() => onClose?.()}
            className={`flex items-center gap-3 mx-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href) ? "bg-primary/10 text-primary" : "text-text-2 hover:bg-bg hover:text-text"
            } ${collapsed && !onClose ? "justify-center" : ""}`}
          >
            {item.icon}
            {(!collapsed || onClose) && item.label}
          </Link>
        ))}

        {setores.length > 0 && (!collapsed || onClose) && (
          <>
            <div className="mt-3 px-5 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Por setor</p>
            </div>
            {setores.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 mx-2 rounded-xl px-3 py-2 text-sm text-text-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
                {s.nome}
                <span className="ml-auto text-xs text-text-3">{s.count}</span>
              </div>
            ))}
          </>
        )}
      </nav>

      {(!collapsed || onClose) && (
        <div className="border-t border-border p-3" style={onClose ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" } : {}}>
          <Button as="a" href="/cadastro" onClick={() => onClose?.()} className="w-full justify-center">
            Novo usuário
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* FAB mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Menu de usuários"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:hidden"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))", boxShadow: "0 4px 20px rgba(15,76,129,0.4)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Drawer mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <NavContent onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-surface transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}>
        <NavContent />
      </aside>
    </>
  );
}
