import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { UserProvider } from "@/modules/squadframe/components/user-provider";
import { MobileNav } from "@/modules/squadframe/components/mobile-nav";
import { BuscaGlobal } from "@/modules/squadframe/components/busca-global";
import { ToastProvider } from "@/modules/squadframe/components/toast";
import { NotificacoesBadge } from "@/modules/squadframe/components/notificacoes/notificacoes-badge";
import { PwaProvider } from "@/modules/squadframe/components/pwa-provider";
import { OfflineBanner, UpdateBanner } from "@/modules/squadframe/components/pwa-banners";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import { AppHeader } from "@/ui/layout/AppHeader";
import { ThemeProvider } from "@/ui/theme/ThemeProvider";
import { ThemeScript } from "@/ui/theme/ThemeScript";
import "./globals.css";

const ThemeToggle = dynamic(
  () => import("@/modules/squadframe/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

export const viewport: Viewport = {
  themeColor: "#222831",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SquadFrame",
  description: "Gestão Industrial Para Esquadrias",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SquadFrame",
    "mobile-web-app-capable": "yes",
  },
};

const NAV_ITEMS = [
  { href: "/obras",      label: "Obras" },
  { href: "/catalogo",   label: "Catálogo" },
  { href: "/compras",    label: "Compras" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/tarefas",    label: "Tarefas" },
  { href: "/usuarios",   label: "Usuários" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();

  let naoLidasCount = 0;
  if (usuario) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("notificacoes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuario.id)
      .eq("lida", false);
    naoLidasCount = count ?? 0;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <PwaProvider usuarioId={usuario?.id} vapidPublicKey={vapidPublicKey}>
            <UpdateBanner />
            <OfflineBanner />

            {usuario && (
              <AppHeader
                navItems={NAV_ITEMS}
                mobileNavSlot={<MobileNav />}
                rightSlot={
                  <>
                    <BuscaGlobal />
                    <NotificacoesBadge usuarioId={usuario.id} naoLidasIniciais={naoLidasCount} />
                    <ThemeToggle />
                    <HeaderUser usuario={usuario} />
                  </>
                }
              />
            )}

            <UserProvider usuario={usuario}>
              <ToastProvider>
                <main style={usuario ? { paddingTop: "calc(56px + env(safe-area-inset-top))" } : undefined}>
                  {children}
                </main>
              </ToastProvider>
            </UserProvider>
          </PwaProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
