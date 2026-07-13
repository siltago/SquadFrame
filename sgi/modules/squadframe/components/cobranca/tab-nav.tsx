"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ABAS = [
  { slug: "central", label: "Minha Central" },
  { slug: "cobranca", label: "Dashboard" },
] as const;

export function CentralTabNav({ podeCobranca }: { podeCobranca: boolean }) {
  const searchParams = useSearchParams();
  const abaAtual = searchParams.get("aba") ?? "central";

  if (!podeCobranca) return null;

  return (
    <div className="flex gap-1">
      {ABAS.map(({ slug, label }) => {
        const active = abaAtual === slug;
        return (
          <Link
            key={slug}
            href={`/squadframe?aba=${slug}`}
            className={
              active
                ? "border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-text shrink-0"
                : "px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2 shrink-0"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
