"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { usePode } from "@/components/user-provider";

const NAV_ITEMS = [
  {
    href: "/compras",
    label: "Painel",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    href: "/compras/solicitacoes",
    label: "Solicitações",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    href: "/compras/pedidos",
    label: "Pedidos",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  },
  {
    href: "/compras/fornecedores",
    label: "Fornecedores",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: "/compras/empresa",
    label: "Empresa",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>,
  },
  {
    href: "/compras/formas-pagamento",
    label: "Formas de Pgto.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
];

export function ComprasSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const podeCriarPedido = usePode("compras.pedido.criar");
  const podeCriarSolicitacao = usePode("compras.solicitacao.criar");

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/compras" ? pathname === "/compras" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle button — fixed bottom right */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Menu de compras"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-steel text-white shadow-lg lg:hidden"
        style={{ boxShadow: "0 4px 20px rgba(15,76,129,0.4)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <div>
            <BackButton href="/" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Compras</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-canvas">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-steel/10 text-steel" : "text-ink-soft hover:bg-canvas hover:text-ink"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3 space-y-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          {podeCriarSolicitacao && <Link href="/compras/solicitacoes/nova" className="btn-primary w-full text-center text-sm">Nova solicitação</Link>}
          {podeCriarPedido && <Link href="/compras/pedidos/novo" className="btn-ghost w-full text-center text-sm">Novo pedido</Link>}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-line bg-surface transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-3">
          {!collapsed && (
            <div>
              <BackButton href="/" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Compras</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-canvas transition-colors ${collapsed ? "mx-auto" : ""}`}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <><polyline points="9 18 15 12 9 6"/></>
              ) : (
                <><polyline points="15 18 9 12 15 6"/></>
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-steel/10 text-steel" : "text-ink-soft hover:bg-canvas hover:text-ink"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>

        {!collapsed && (podeCriarSolicitacao || podeCriarPedido) && (
          <div className="border-t border-line p-3 space-y-2">
            {podeCriarSolicitacao && <Link href="/compras/solicitacoes/nova" className="btn-primary w-full text-center text-sm">Nova solicitação</Link>}
            {podeCriarPedido && <Link href="/compras/pedidos/novo" className="btn-ghost w-full text-center text-sm">Novo pedido</Link>}
          </div>
        )}
      </aside>
    </>
  );
}
