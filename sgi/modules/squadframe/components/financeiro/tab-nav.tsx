"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/ui/lib/cn";
import { Tooltip } from "@/ui/components/Tooltip";
import { BarChartIcon, DollarSignIcon, CreditCardIcon, DocumentIcon } from "@/ui/icons";

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
  const emContratos = pathname?.startsWith("/squadframe/financeiro/contratos");
  const abaAtual = emContratos ? null : (searchParams.get("aba") ?? "dashboard");

  return (
    <nav className="fixed left-3 top-[158px] z-40 flex w-14 flex-col items-center gap-1.5 py-1 sm:left-5">
      {ABAS.map(({ slug, label, icon: Icon }) => {
        const show = slug === "dashboard" ? podeDashboard : podeCarteiras;
        if (!show) return null;
        const active = abaAtual === slug;
        return (
          <Tooltip key={slug} content={label} side="right" delay={150}>
            <Link
              href={`/squadframe/financeiro?aba=${slug}`}
              aria-label={label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110",
                active
                  ? "bg-primary text-white shadow-md"
                  : "text-text-3 hover:bg-surface-2 hover:text-text"
              )}
            >
              <Icon size={19} />
            </Link>
          </Tooltip>
        );
      })}
      {podeContratos && (
        <Tooltip content="Contratos" side="right" delay={150}>
          <Link
            href="/squadframe/financeiro/contratos"
            aria-label="Contratos"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110",
              emContratos
                ? "bg-primary text-white shadow-md"
                : "text-text-3 hover:bg-surface-2 hover:text-text"
            )}
          >
            <DocumentIcon size={19} />
          </Link>
        </Tooltip>
      )}
    </nav>
  );
}
