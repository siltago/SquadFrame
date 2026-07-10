import type { Metadata, Viewport } from "next";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { UserProvider } from "@/modules/squadframe/components/user-provider";
import { ToastProvider } from "@/modules/squadframe/components/toast";
import { PwaProvider } from "@/modules/squadframe/components/pwa-provider";
import { OfflineBanner, UpdateBanner } from "@/modules/squadframe/components/pwa-banners";
import { ThemeProvider } from "@/ui/theme/ThemeProvider";
import { ThemeScript } from "@/ui/theme/ThemeScript";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#222831",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SquadSystem",
  description: "Plataforma modular de gestão industrial",
  manifest: "/manifest.webmanifest",
  icons: {
    // Favicon da aba do navegador — logo do SquadSystem (mesma da tela de
    // login). Não usa app/icon.png de propósito: aquele arquivo também é o
    // ícone do card "SquadFrame" na tela de seleção de módulos.
    icon: "/icon-v3.png",
    apple: "/apple-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SquadSystem",
    "mobile-web-app-capable": "yes",
  },
};

// Layout raiz global — não deve conter chrome operacional de nenhum módulo
// (nav, sidebar, header de módulo). Isso vive no layout.tsx de cada módulo
// (ex: app/squadframe/layout.tsx). Aqui só o que é realmente cross-módulo:
// tema, PWA/push, contexto de usuário e toasts.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
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
            <UserProvider usuario={usuario}>
              <ToastProvider>
                {children}
              </ToastProvider>
            </UserProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
