import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import { AppHeader } from "@/ui/layout/AppHeader";
import { LayersIcon, TruckIcon, RefreshIcon, BookOpenIcon } from "@/ui/icons";

const NAV_ITEMS = [
  { href: "/squadstock", label: "Estoque", exact: true, icon: <LayersIcon /> },
  { href: "/squadstock/recebimento", label: "Recebimento", icon: <TruckIcon /> },
  { href: "/squadstock/movimentacoes", label: "Movimentações", icon: <RefreshIcon /> },
  { href: "/squadstock/catalogo", label: "Catálogo", icon: <BookOpenIcon /> },
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
        // Mesmo mecanismo do squadframe (breakpoint do rótulo de texto de
        // cada aba), só que proporcional: 4 abas + só avatar no rightSlot
        // (sem busca/notificação/tema) cabem com o texto bem antes de
        // 1536px — não faz sentido esperar a mesma largura de uma nav com
        // quase o dobro de itens e mais elementos à direita.
        navLabelBreakpoint="lg"
      />
      <main style={{ paddingTop: "calc(84px + env(safe-area-inset-top))" }}>{children}</main>
    </div>
  );
}
