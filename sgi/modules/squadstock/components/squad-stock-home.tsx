import Link from "next/link";
import { Badge } from "@/ui/components/Badge";

export function SquadStockHome() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-text-2 hover:text-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm font-medium">SquadSystem</span>
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-8 sm:px-10">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">SquadStock</h1>
          <Badge variant="default" size="sm">Em breve</Badge>
        </div>
        <p className="text-base text-text-2">
          Gerenciador de estoque, materiais, ferramentas e ativos.
        </p>
      </main>
    </div>
  );
}
