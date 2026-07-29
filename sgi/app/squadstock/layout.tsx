import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import { AppHeader } from "@/ui/layout/AppHeader";

const NAV_ITEMS = [
  { href: "/squadstock", label: "Saldos", exact: true },
  { href: "/squadstock/movimentacoes", label: "Movimentações" },
  { href: "/squadstock/catalogo", label: "Catálogo" },
];

// Shell do SquadStock — mesmo padrão de header do squadframe (AppHeader
// compartilhado), mono-tenant via getUsuarioAtual(). Identidade visual
// (âmbar #F39C12, raio flat) escopada via classe .squadstock, mesmo
// padrão de .frame/.squadboard/.squadwise em app/globals.css — ver
// docs/squadstock/design-system.md.
export default async function SquadStockLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <div className="squadstock min-h-screen bg-bg text-text">
      <AppHeader
        logoSrc="/logo-stock.png"
        logoAlt="SquadStock"
        appName="SquadStock"
        homeHref="/squadstock"
        navItems={NAV_ITEMS}
        rightSlot={<HeaderUser usuario={usuario} />}
      />
      <main style={{ paddingTop: "calc(56px + env(safe-area-inset-top))" }}>{children}</main>
    </div>
  );
}
