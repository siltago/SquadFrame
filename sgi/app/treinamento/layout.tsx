import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import { AppHeader } from "@/ui/layout/AppHeader";

const ThemeToggle = dynamic(
  () => import("@/modules/squadframe/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

// Área própria de treinamento — cross-módulo (Compras, Wise, etc. conforme
// for sendo escrito), por isso não vive dentro do layout do SquadFrame nem
// do Wise. Único requisito de acesso: estar logado (sem permissão específica).
export default async function TreinamentoLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <>
      <AppHeader
        appName="Treinamento"
        homeHref="/treinamento"
        rightSlot={
          <>
            <ThemeToggle />
            <HeaderUser usuario={usuario} />
          </>
        }
      />
      <main style={{ paddingTop: "calc(56px + env(safe-area-inset-top))" }}>
        {children}
      </main>
    </>
  );
}
