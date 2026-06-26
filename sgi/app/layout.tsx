import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getUsuarioAtual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { HeaderUser } from "@/components/header-user";
import { UserProvider } from "@/components/user-provider";
import { MobileNav } from "@/components/mobile-nav";
import { BuscaGlobal } from "@/components/busca-global";
import { ToastProvider } from "@/components/toast";
import { NotificacoesBadge } from "@/components/notificacoes/notificacoes-badge";
import { PwaProvider } from "@/components/pwa-provider";
import { OfflineBanner, UpdateBanner } from "@/components/pwa-banners";
import "./globals.css";

const ThemeToggle = dynamic(
  () => import("@/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

export const viewport: Viewport = {
  themeColor: "#0F4C81",
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
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SquadFrame",
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <body>
        <PwaProvider usuarioId={usuario?.id} vapidPublicKey={vapidPublicKey}>
        <UpdateBanner />
        <OfflineBanner />
        {usuario && (
          <header
            className="fixed inset-x-0 top-0 z-50 flex items-end gap-2 px-3 sm:gap-3 sm:px-5"
            style={{
              backgroundColor: "#0F4C81",
              paddingTop: "env(safe-area-inset-top)",
              height: "calc(56px + env(safe-area-inset-top))",
            }}
          >
            {/* Hamburguer — só mobile */}
            <MobileNav />

            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image src="/icon.png" alt="SquadFrame" width={36} height={36} className="shrink-0" />
              <span className="text-base font-bold leading-none text-white">
                SquadFrame
              </span>
            </Link>

            {/* Navegação desktop */}
            <nav className="hidden sm:flex flex-1 items-center gap-0.5 px-2">
              {[
                { href: "/obras",    label: "Obras" },
                { href: "/catalogo", label: "Catálogo" },
                { href: "/compras",  label: "Compras" },
                { href: "/tarefas",  label: "Tarefas" },
                { href: "/usuarios", label: "Usuários" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Direita */}
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <BuscaGlobal />
              <NotificacoesBadge usuarioId={usuario!.id} naoLidasIniciais={naoLidasCount} />
              <ThemeToggle />
              <HeaderUser usuario={usuario} />
            </div>
          </header>
        )}

        <UserProvider usuario={usuario}>
          <ToastProvider>
            <main
              className={usuario ? "" : ""}
              style={usuario ? { paddingTop: "calc(56px + env(safe-area-inset-top))" } : undefined}
            >{children}</main>
          </ToastProvider>
        </UserProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
