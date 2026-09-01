"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { BarChartIcon, DollarSignIcon, CreditCardIcon, DocumentIcon, MenuIcon, CloseIcon } from "@/ui/icons";

const ABAS = [
  { slug: "dashboard",           label: "Dashboard",         icon: BarChartIcon },
  { slug: "carteiras",           label: "Carteiras",         icon: DollarSignIcon },
  { slug: "faturamento-direto",  label: "Faturamento Direto", icon: CreditCardIcon },
] as const;

// Rail vertical fino de ícones — mesmo padrão de navegação secundária que a
// referência visual usa (ícone + tooltip, sem texto solto ao lado), em vez
// da faixa de abas em texto que existia antes. Não move nada de rota, só
// muda o formato do seletor de aba dentro da própria página financeiro.
// Fixed na tela (não fica dentro do fluxo do conteúdo centralizado) e
// ancorado no MESMO left que o header usa (px-3/sm:px-5) — é a única forma
// de garantir que a coluna de ícones fique exatamente embaixo do logo, já
// que o conteúdo da página é centralizado (max-w-6xl mx-auto) e o header
// não é, então os dois nunca compartilhariam a mesma origem X se o rail
// ficasse dentro do fluxo normal do conteúdo.
// Abaixo de lg (1024px) vira FAB + drawer, mesmo padrão dos outros menus
// laterais do sistema (Compras, Usuários, Catálogo…) — sem isso, o rail
// fixo ficava sempre visível mesmo em tela estreita, brigando por espaço
// com o resto do conteúdo.
export function FinanceiroTabNav({
  podeDashboard,
  podeCarteiras,
  podeContratos,
}: {
  podeDashboard: boolean;
  podeCarteiras: boolean;
  podeContratos?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const emContratos = pathname?.startsWith("/squadframe/financeiro/contratos");
  const abaAtual = emContratos ? null : (searchParams.get("aba") ?? "dashboard");

  useEffect(() => { setMobileOpen(false); }, [pathname, searchParams]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const abas = ABAS.filter(({ slug }) => (slug === "dashboard" ? podeDashboard : podeCarteiras));

  const railItem = (href: string, label: string, active: boolean, Icon: typeof BarChartIcon) => (
    <Tooltip key={href} content={label} side="right" delay={150}>
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110",
          active ? "bg-primary text-white shadow-md" : "text-text-3 hover:bg-surface-2 hover:text-text"
        )}
      >
        <Icon size={19} />
      </Link>
    </Tooltip>
  );

  const drawerItem = (href: string, label: string, active: boolean, Icon: typeof BarChartIcon) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-white" : "text-text-2 hover:bg-bg hover:text-text"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );

  return (
    <>
      {/* Rail desktop */}
      <nav className="fixed left-3 top-[158px] z-40 hidden w-14 flex-col items-center gap-1.5 py-1 sm:left-5 lg:flex">
        {abas.map(({ slug, label, icon }) => railItem(`/squadframe/financeiro?aba=${slug}`, label, abaAtual === slug, icon))}
        {podeContratos && railItem("/squadframe/financeiro/contratos", "Contratos", !!emContratos, DocumentIcon)}
      </nav>

      {/* FAB mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 active:scale-95 lg:hidden"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))", boxShadow: "0 4px 20px rgb(var(--color-primary) / 0.4)" }}
      >
        <MenuIcon size={22} />
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Drawer mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Financeiro</p>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {abas.map(({ slug, label, icon }) => drawerItem(`/squadframe/financeiro?aba=${slug}`, label, abaAtual === slug, icon))}
          {podeContratos && drawerItem("/squadframe/financeiro/contratos", "Contratos", !!emContratos, DocumentIcon)}
        </nav>
      </div>
    </>
  );
}
