"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { tabLinkClass } from "@/modules/squadframe/lib/tab-link-class";

const ABAS = [
  { slug: "cobranca", label: "Dashboard" },
  { slug: "central", label: "Minha Central" },
] as const;

export function CentralTabNav({ podeCobranca }: { podeCobranca: boolean }) {
  const searchParams = useSearchParams();
  const abaAtual = searchParams.get("aba") ?? (podeCobranca ? "cobranca" : "central");

  if (!podeCobranca) return null;

  return (
    <div className="flex gap-1">
      {ABAS.map(({ slug, label }) => {
        const active = abaAtual === slug;
        return (
          <Link
            key={slug}
            href={`/squadframe?aba=${slug}`}
            className={tabLinkClass(active)}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
