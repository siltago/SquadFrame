import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { MobileNav } from "@/modules/squadframe/components/mobile-nav";
import { BuscaGlobal } from "@/modules/squadframe/components/busca-global";
import { NotificacoesBadge } from "@/modules/squadframe/components/notificacoes/notificacoes-badge";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import { AppHeader } from "@/ui/layout/AppHeader";
import { TIPOS_NOTIFICACAO_POR_ESCOPO } from "@/modules/squadframe/types/kanban";
import { PendenciasGate } from "@/modules/squadframe/components/pendencias/pendencias-gate";
import { detectarPendenciasComprador } from "@/modules/squadframe/services/pendencias/detectar-pendencias";
import { DestaquesBanner } from "@/modules/squadframe/components/destaques/destaques-banner";
import { detectarDestaquesDashboard } from "@/modules/squadframe/services/destaques/detectar-destaques";

const ThemeToggle = dynamic(
  () => import("@/modules/squadframe/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

const NAV_ITEMS = [
  { href: "/squadframe/obras",           label: "Obras" },
  { href: "/squadframe/compras",         label: "Compras" },
  { href: "/squadframe/financeiro",      label: "Financeiro" },
  { href: "/squadframe/beneficiamento",  label: "Beneficiamento" },
  { href: "/squadframe/tarefas",         label: "Tarefas" },
  { href: "/squadframe/documentos",      label: "Documentos" },
  { href: "/squadframe/usuarios",        label: "Usuários" },
];

// Shell operacional do módulo SquadFrame (header, nav, notificações).
// Não vive no layout raiz — cada módulo do SquadSystem tem o seu.
export default async function SquadFrameLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();
  const { count } = await admin
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id)
    .eq("lida", false)
    .in("tipo", TIPOS_NOTIFICACAO_POR_ESCOPO.squadframe);
  const naoLidasCount = count ?? 0;
  const pendencias = await detectarPendenciasComprador(usuario.id);
  const destaques = await detectarDestaquesDashboard(usuario);

  return (
    <>
      <PendenciasGate pendenciasIniciais={pendencias} />
      <DestaquesBanner destaquesIniciais={destaques} />
      <AppHeader
        logoAlt="SquadFrame"
        appName="SquadFrame"
        homeHref="/squadframe"
        navItems={NAV_ITEMS}
        mobileNavSlot={<MobileNav />}
        rightSlot={
          <>
            <BuscaGlobal />
            <NotificacoesBadge usuarioId={usuario.id} naoLidasIniciais={naoLidasCount} escopo="squadframe" />
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
