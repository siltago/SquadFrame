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
import { calcularBloqueio } from "@/modules/squadframe/services/pendencias/verificar-bloqueio";
import { listarColegasDoSetor } from "@/modules/squadframe/services/hierarquia/gestores";
import { listarExcecoesPendentesParaGestor } from "@/modules/squadframe/actions/compras/prorrogacoes";
import { BloqueioComprasProvider } from "@/modules/squadframe/components/pendencias/bloqueio-compras-context";
import {
  BuildingIcon, ShoppingBagIcon, DollarSignIcon, RefreshIcon, TasksIcon, DocumentIcon, UsersIcon,
} from "@/ui/icons";

const ThemeToggle = dynamic(
  () => import("@/modules/squadframe/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

const NAV_ITEMS = [
  { href: "/squadframe/obras",           label: "Obras",           icon: <BuildingIcon /> },
  { href: "/squadframe/compras",         label: "Compras",         icon: <ShoppingBagIcon /> },
  { href: "/squadframe/financeiro",      label: "Financeiro",      icon: <DollarSignIcon /> },
  { href: "/squadframe/beneficiamento",  label: "Beneficiamento",  icon: <RefreshIcon /> },
  { href: "/squadframe/tarefas",         label: "Tarefas",         icon: <TasksIcon /> },
  { href: "/squadframe/documentos",      label: "Documentos",      icon: <DocumentIcon /> },
  { href: "/squadframe/usuarios",        label: "Usuários",        icon: <UsersIcon /> },
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
  const [bloqueio, colegas, excecoesPendentes] = await Promise.all([
    calcularBloqueio(usuario.id),
    listarColegasDoSetor(usuario.id),
    listarExcecoesPendentesParaGestor(usuario.id),
  ]);

  return (
    <BloqueioComprasProvider bloqueio={bloqueio}>
      <PendenciasGate pendenciasIniciais={pendencias} colegas={colegas} excecoesPendentesIniciais={excecoesPendentes} />
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
            <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
            <HeaderUser usuario={usuario} />
          </>
        }
      />
      <main style={{ paddingTop: "calc(84px + env(safe-area-inset-top))" }}>
        {children}
      </main>
    </BloqueioComprasProvider>
  );
}
