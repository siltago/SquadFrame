"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { Button } from "@/ui/components/Button";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { PlusIcon, ArrowLeftIcon } from "@/ui/icons";

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

// Rail estreito no desktop (mesmo padrão do FinanceiroTabNav: ícone +
// bolinha escura no ativo + tooltip), drawer completo com rótulos e a
// lista de setores no mobile (onde o espaço extra faz sentido).
export function UsuariosSidebar({ setores }: { setores: Setor[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/squadframe/usuarios" ? pathname === "/squadframe/usuarios" : pathname.startsWith(href);

  return (
    <>
      {/* FAB mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Menu de usuários"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95 lg:hidden"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))", boxShadow: "0 4px 20px rgb(var(--color-primary) / 0.4)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Drawer mobile — rótulos + setores, espaço não é problema aqui */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <div>
            <BackButton href="/" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-3">Usuários</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {TOP_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 mx-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-primary text-white" : "text-text-2 hover:bg-bg hover:text-text"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {setores.length > 0 && (
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

        <div className="border-t border-border p-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <Button as="a" href="/cadastro" variant="accent" onClick={() => setMobileOpen(false)} className="w-full justify-center">
            Novo usuário
          </Button>
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="hidden lg:flex w-[64px] shrink-0 flex-col items-center">
        <div className="flex shrink-0 flex-col items-center py-3">
          <Tooltip content="Voltar" side="right" delay={150}>
            <Link
              href="/"
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-3 transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110 hover:bg-surface-2 hover:text-text"
            >
              <ArrowLeftIcon size={16} />
            </Link>
          </Tooltip>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-3">
          {TOP_ITEMS.map((item) => (
            <Tooltip key={item.href} content={item.label} side="right" delay={150}>
              <Link
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full",
                  "transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110",
                  isActive(item.href) ? "bg-primary text-white shadow-md" : "text-text-3 hover:bg-surface-2 hover:text-text"
                )}
              >
                {item.icon}
              </Link>
            </Tooltip>
          ))}
        </nav>
        <div className="flex shrink-0 flex-col items-center gap-1.5 py-3">
          <Tooltip content="Novo usuário" side="right" delay={150}>
            <Link
              href="/cadastro"
              aria-label="Novo usuário"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-110"
            >
              <PlusIcon size={18} />
            </Link>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}
