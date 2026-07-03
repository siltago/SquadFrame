import { LogoutButton } from "@/modules/home/components/logout-button";
import { ModuleCard } from "@/modules/home/components/module-card";
import { MODULOS } from "@/modules/home/data/modules";

export function SquadSystemHome({ nomeUsuario }: { nomeUsuario: string }) {
  return (
    <div className="squadsystem min-h-screen bg-bg">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <img src="/logo-system.png" alt="SquadSystem" className="h-[42px] w-[42px] rounded-lg object-contain" />
          <span className="text-base font-bold text-text">SquadSystem</span>
        </div>
        <LogoutButton nome={nomeUsuario} />
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-8 sm:px-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">SquadSystem</h1>
          <p className="mt-2 text-base text-text-2">
            Hub central dos módulos SquadSystem. Escolha onde você quer trabalhar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODULOS.map((modulo) => (
            <ModuleCard key={modulo.slug} modulo={modulo} />
          ))}
        </div>
      </main>
    </div>
  );
}
