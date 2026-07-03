import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { EmptyState } from "@/ui/components/EmptyState";

export function SquadBoardHome() {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">SquadBoard</h1>
          <p className="mt-2 text-base text-text-2">
            Gerenciador visual de quadros, listas, cards e fluxos de tarefas.
          </p>
        </div>

        <div className="card p-10">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="7" height="16" rx="1.5" />
                <rect x="14" y="4" width="7" height="10" rx="1.5" />
              </svg>
            }
            title="Nenhum quadro criado ainda"
            description="O SquadBoard está em construção. Em breve você poderá criar quadros visuais para acompanhar fluxos de trabalho."
          />
          <div className="mt-5 flex justify-center">
            <Button disabled variant="secondary">
              Criar quadro
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
