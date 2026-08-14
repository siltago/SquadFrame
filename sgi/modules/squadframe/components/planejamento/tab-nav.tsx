"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { tabLinkClass } from "@/modules/squadframe/lib/tab-link-class";

const ABAS = [
  { slug: "dashboard",     label: "Dashboard" },
  { slug: "gerenciamento", label: "Gerenciamento" },
] as const;

export function PlanejamentoTabNav() {
  const searchParams = useSearchParams();
  const abaAtual = searchParams.get("aba") ?? "dashboard";

  return (
    <div className="flex gap-1 border-b border-border mt-6">
      {ABAS.map(({ slug, label }) => (
        <Link key={slug} href={`/squadframe/planejamento?aba=${slug}`} className={tabLinkClass(abaAtual === slug)}>
          {label}
        </Link>
      ))}
    </div>
  );
}
