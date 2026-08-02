"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { tabLinkClass } from "@/modules/squadframe/lib/tab-link-class";

const ABAS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "carteiras", label: "Carteiras" },
  { slug: "faturamento-direto", label: "Faturamento Direto" },
] as const;

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
    <div className="flex gap-1 border-b border-border mt-6">
      {ABAS.map(({ slug, label }) => {
        const show = slug === "dashboard" ? podeDashboard : podeCarteiras;
        if (!show) return null;
        const active = abaAtual === slug;
        return (
          <Link
            key={slug}
            href={`/squadframe/financeiro?aba=${slug}`}
            className={tabLinkClass(active)}
          >
            {label}
          </Link>
        );
      })}
      {podeContratos && (
        <Link
          href="/squadframe/financeiro/contratos"
          className={tabLinkClass(!!emContratos)}
        >
          Contratos
        </Link>
      )}
    </div>
  );
}
