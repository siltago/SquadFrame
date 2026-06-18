import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getUsuarioAtual } from "@/lib/auth";
import { HeaderUser } from "@/components/header-user";
import { UserProvider } from "@/components/user-provider";
import "./globals.css";

const ThemeToggle = dynamic(
  () => import("@/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "SGI — Gestão Industrial",
  description: "Sistema de gestão para esquadrias e vidros",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {usuario && (
          <header
            className="fixed inset-x-0 top-0 z-50 flex items-center gap-2 px-3 sm:gap-3 sm:px-4"
            style={{ backgroundColor: "#0F4C81", height: 56 }}
          >
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm font-bold text-white"
                style={{ backgroundColor: "#0a3660" }}
              >
                S
              </div>
              <span className="hidden text-base font-bold leading-none text-white sm:block">
                SGI
              </span>
            </Link>

            {/* Navegação — scroll horizontal em telas pequenas */}
            <nav className="flex flex-1 items-center overflow-x-auto gap-0.5 px-1 sm:gap-1 sm:px-3 scrollbar-none">
              {[
                { href: "/obras",    label: "Obras" },
                { href: "/catalogo", label: "Catálogo" },
                { href: "/compras",  label: "Compras" },
                { href: "/usuarios", label: "Usuários" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Direita */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <HeaderUser usuario={usuario} />
            </div>
          </header>
        )}

        <UserProvider usuario={usuario}>
          <main className={usuario ? "pt-14" : ""}>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
